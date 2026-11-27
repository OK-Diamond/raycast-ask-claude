import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  LaunchProps,
  getPreferenceValues,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { askClaude } from "./claude";

interface Preferences {
  model: string;
  claudePath?: string;
  systemPrompt?: string;
}

interface Turn {
  question: string;
  answer: string;
}

const DEFAULT_SYSTEM =
  "You are a helpful assistant answering quick questions typed into a desktop launcher. Be concise and direct. Use Markdown.";

export default function Command(props: LaunchProps<{ arguments: { question?: string } }>) {
  const initial = (props.arguments?.question || props.fallbackText || "").trim();
  if (!initial) return <QuestionForm />;
  return <Conversation question={initial} />;
}

function QuestionForm(props: { sessionId?: string; history?: Turn[] }) {
  const { push } = useNavigation();
  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Ask Claude"
            icon={Icon.Message}
            onSubmit={(v: { question: string }) => {
              const q = v.question.trim();
              if (q) push(<Conversation question={q} sessionId={props.sessionId} history={props.history} />);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="question" title={props.sessionId ? "Follow-up" : "Question"} autoFocus />
    </Form>
  );
}

function Conversation(props: { question: string; sessionId?: string; history?: Turn[] }) {
  const prefs = getPreferenceValues<Preferences>();
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | undefined>(props.sessionId);
  useEffect(() => {
    // Start on the next tick so React's dev-mode mount/unmount/remount
    // cancels the timer instead of killing a running claude process.
    let cancelled = false;
    let child: ReturnType<typeof askClaude> | undefined;
    const timer = setTimeout(() => {
      child = askClaude({
        prompt: props.question,
        model: prefs.model || "sonnet",
        systemPrompt: prefs.systemPrompt?.trim() || DEFAULT_SYSTEM,
        claudePath: prefs.claudePath,
        resumeSessionId: props.sessionId,
        onText: (t) => !cancelled && setAnswer(t),
        onDone: ({ text, sessionId }) => {
          if (cancelled) return;
          setAnswer(text);
          if (sessionId) setSessionId(sessionId);
          setLoading(false);
        },
        onError: (msg) => {
          if (cancelled) return;
          setError(msg);
          setLoading(false);
        },
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (child && child.exitCode === null) child.kill();
    };
  }, []);

  const history = props.history ?? [];
  const thisTurn: Turn = { question: props.question, answer };
  const transcript = [...history, thisTurn]
    .map((t) => `**${t.question}**\n\n${t.answer || (loading ? "_Thinking…_" : "")}`)
    .join("\n\n---\n\n");
  const markdown = error ? `${transcript}\n\n> ⚠️ ${error.replace(/\n/g, "\n> ")}` : transcript;

  return (
    <Detail
      isLoading={loading}
      markdown={markdown}
      navigationTitle="Ask Claude"
      actions={
        <ActionPanel>
          {!loading && sessionId && !error && (
            <Action.Push
              title="Ask Follow-Up"
              icon={Icon.Reply}
              shortcut={{ modifiers: ["ctrl"], key: "f" }}
              target={<QuestionForm sessionId={sessionId} history={[...history, thisTurn]} />}
            />
          )}
          {answer && <Action.CopyToClipboard title="Copy Answer" content={answer} />}
          {answer && <Action.Paste title="Paste Answer" content={answer} />}
          <Action.OpenInBrowser
            title="Continue on Claude.ai"
            url={`https://claude.ai/new?q=${encodeURIComponent(props.question)}`}
            shortcut={{ modifiers: ["ctrl"], key: "o" }}
          />
        </ActionPanel>
      }
    />
  );
}
