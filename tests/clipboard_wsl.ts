import { chmodSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const scratch = mkdtempSync(join(tmpdir(), "ulvim-clipboard-test-"));
const bin = join(scratch, "bin");
const config = join(scratch, "config");
const state = join(scratch, "state");
const captures = join(scratch, "captures");
for (const dir of [bin, config, state, captures]) mkdirSync(dir);
symlinkSync(ROOT, join(config, "ulvim"));

const shim = (name: string) => `#!/usr/bin/env bun
const base = process.env.ULVIM_CLIP_CAPTURE_DIR;
const name = ${JSON.stringify(name)};
const input = await Bun.stdin.text();
await Bun.write(base + "/" + name + ".stdin", input);
await Bun.write(base + "/" + name + ".args.json", JSON.stringify(process.argv.slice(2)));
`;
for (const name of ["powershell.exe", "clip.exe", "wsl-clip"]) {
  const path = join(bin, name);
  writeFileSync(path, shim(name), { mode: 0o755 });
  chmodSync(path, 0o755);
}

const text = "ULVim-clipboard-check-ç-│";
const run = Bun.spawnSync(
  ["/usr/bin/nvim", "--headless", "-c", `lua vim.fn.setreg("+", ${JSON.stringify(text)}); vim.cmd("qa!")`, "+qa"],
  {
    cwd: ROOT,
    env: {
      ...process.env,
      NVIM_APPNAME: "ulvim",
      XDG_CONFIG_HOME: config,
      XDG_STATE_HOME: state,
      PATH: bin + delimiter + process.env.PATH,
      ULVIM_CLIP_CAPTURE_DIR: captures,
    },
    stdout: "pipe",
    stderr: "pipe",
    timeout: 20_000,
  },
);

try {
  const captured = join(captures, "powershell.exe.stdin");
  const argsPath = join(captures, "powershell.exe.args.json");
  if (run.exitCode !== 0 || readFileSync(captured, "utf8") !== text) {
    throw new Error("Neovim did not send the exact Unicode yank to PowerShell");
  }
  const args = JSON.parse(readFileSync(argsPath, "utf8")) as string[];
  const command = args[args.indexOf("-Command") + 1] ?? "";
  if (!command.includes("InputEncoding") || !command.includes("Set-Clipboard -Value $text")) {
    throw new Error("PowerShell copy command does not decode UTF-8 and set the clipboard");
  }
  console.log("PASS wsl clipboard copy: exact Unicode stdin, PowerShell UTF-8 Set-Clipboard");
} catch (error) {
  console.error("FAIL wsl clipboard copy: " + (error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
