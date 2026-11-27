# Ask Claude for Raycast

A Raycast command that answers questions with Claude, using your **Claude Pro/Max subscription** instead of Raycast AI or an API key.

It works by running the official [Claude Code](https://claude.com/claude-code) CLI in headless mode (`claude -p`), which is signed in to your Claude account. No API key is stored in this extension. Questions count toward your normal Claude usage limits.

## Requirements

- [Raycast](https://raycast.com) (Windows or macOS)
- [Node.js](https://nodejs.org) 20+
- Claude Code, installed with the native installer and signed in:
  - Windows (PowerShell): `irm https://claude.ai/install.ps1 | iex`
  - macOS: `curl -fsSL https://claude.ai/install.sh | bash`
  - Then run `claude` once and sign in with your Claude account.

## Install

```sh
git clone https://github.com/OK-Diamond/raycast-ask-claude.git
cd raycast-ask-claude
npm install
npm run dev
```

When it prints `ready - built extension successfully`, **Ask Claude** appears in Raycast. Press `Ctrl+C` to stop dev mode; the extension stays installed. Run `npm run dev` again after pulling changes.

> On Windows, `npm run dev` first runs `scripts/fix-windows-target.js`, which points the Raycast CLI at `~/.config/raycast` (it otherwise builds to `~/.config/raycast-x`, which Raycast for Windows 2.x doesn't load, giving a "Missing executable" error).

## Use it as a fallback (type a question, press Enter)

Type anything in Raycast, click the ⚙ next to **Use "…" with…**, add **Ask Claude**, and drag it to the top.

## Actions

| Shortcut | Action |
| --- | --- |
| `Enter` / `Ctrl+F` | Ask a follow-up (keeps the conversation) |
| | Copy / paste the answer |
| `Ctrl+O` | Continue the question on claude.ai |

## Preferences

- **Model**: Haiku (fastest), Sonnet (default) or Opus.
- **Claude CLI path**: leave blank to use `~/.local/bin/claude(.exe)`.
- **System prompt**: instructions sent with every question.

## License

[MIT](LICENSE)
