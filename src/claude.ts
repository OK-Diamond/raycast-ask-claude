import { spawn, ChildProcess } from "child_process";
import { existsSync } from "fs";
import os from "os";
import path from "path";

export interface AskOptions {
  prompt: string;
  model: string;
  systemPrompt: string;
  claudePath?: string;
  resumeSessionId?: string;
  onText: (fullText: string) => void;
  onDone: (result: { text: string; sessionId?: string }) => void;
  onError: (message: string) => void;
}

export function resolveClaudePath(custom?: string): string {
  if (custom && custom.trim()) return custom.trim();
  const exe = process.platform === "win32" ? "claude.exe" : "claude";
  const candidates = [
    path.join(os.homedir(), ".local", "bin", exe),
    path.join(os.homedir(), ".claude", "local", exe),
    "/opt/homebrew/bin/claude",
    "/usr/local/bin/claude",
  ];
  return candidates.find((p) => existsSync(p)) ?? exe;
}

/** Runs `claude -p` with your logged-in subscription and streams the answer back. */
export function askClaude(opts: AskOptions): ChildProcess {
  const args = [
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--include-partial-messages",
    "--model",
    opts.model,
    "--tools",
    "",
    "--strict-mcp-config",
    "--system-prompt",
    opts.systemPrompt,
  ];
  if (opts.resumeSessionId) args.push("--resume", opts.resumeSessionId);

  const child = spawn(resolveClaudePath(opts.claudePath), args, {
    cwd: os.tmpdir(),
    env: process.env,
    windowsHide: true,
  });

  let text = "";
  let sessionId: string | undefined;
  let buffer = "";
  let stderr = "";
  let finished = false;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    let msg: any;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (msg.session_id) sessionId = msg.session_id;
    const ev = msg.type === "stream_event" ? msg.event : undefined;
    if (ev?.type === "content_block_delta" && ev.delta?.type === "text_delta") {
      text += ev.delta.text;
      opts.onText(text);
    } else if (typeof msg.result === "string") {
      if (msg.is_error) {
        finished = true;
        opts.onError(msg.result);
        return;
      }
      if (!text) text = msg.result;
      finished = true;
      opts.onDone({ text, sessionId });
    }
  };

  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => {
    buffer += chunk;
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      handleLine(buffer.slice(0, idx));
      buffer = buffer.slice(idx + 1);
    }
  });
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (c: string) => (stderr += c));

  child.on("error", (err) => {
    finished = true;
    opts.onError(
      `Couldn't start the Claude CLI (${err.message}). Install Claude Code or set "Claude CLI path" in the extension preferences.`,
    );
  });
  child.on("close", (code, signal) => {
    if (buffer) handleLine(buffer);
    if (finished) return;
    if (code === 0) opts.onDone({ text, sessionId });
    else opts.onError(stderr.trim() || (signal ? `claude was stopped (${signal})` : `claude exited with code ${code}`));
  });

  child.stdin.write(opts.prompt);
  child.stdin.end();
  return child;
}
