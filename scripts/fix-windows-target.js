// On Windows, the Raycast CLI defaults to the "x" target and writes dev builds to
// ~/.config/raycast-x. Raycast for Windows 2.x loads extensions from ~/.config/raycast,
// so the command shows up but fails with "Missing executable".
// This points the CLI back at ~/.config/raycast (once, only if not already configured).
const fs = require("fs");
const os = require("os");
const path = require("path");

if (process.platform !== "win32") process.exit(0);

const home = os.homedir();
const raycastExtensions = path.join(home, ".config", "raycast", "extensions");
const cliConfigDir = path.join(home, ".config", "raycast-x");
const cliConfig = path.join(cliConfigDir, "config.json");

if (!fs.existsSync(raycastExtensions)) process.exit(0); // Raycast uses a different layout; leave alone.

let config = {};
try {
  config = JSON.parse(fs.readFileSync(cliConfig, "utf8"));
} catch {
  /* no config yet */
}
if ("Target" in config) process.exit(0);

config.Target = "";
fs.mkdirSync(cliConfigDir, { recursive: true });
fs.writeFileSync(cliConfig, JSON.stringify(config, null, 2));
console.log(`Configured Raycast CLI to build into ${raycastExtensions}`);
