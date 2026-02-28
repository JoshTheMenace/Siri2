import { exec } from "node:child_process";

export interface ShellResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ShellOptions {
  timeout?: number;
  maxBuffer?: number;
  asRoot?: boolean;
}

const DEFAULT_TIMEOUT = 10_000;
const DEFAULT_MAX_BUFFER = 5 * 1024 * 1024; // 5MB for uiautomator output

export function executeShell(
  command: string,
  options: ShellOptions = {}
): Promise<ShellResult> {
  const {
    timeout = DEFAULT_TIMEOUT,
    maxBuffer = DEFAULT_MAX_BUFFER,
    asRoot = true,
  } = options;

  const fullCommand = asRoot ? `su -c ${shellQuote(command)}` : command;

  return new Promise((resolve) => {
    exec(fullCommand, { timeout, maxBuffer }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout?.toString() ?? "",
        stderr: stderr?.toString() ?? "",
        exitCode: error?.code ?? 0,
      });
    });
  });
}

function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}
