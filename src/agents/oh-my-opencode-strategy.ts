import { Database } from 'bun:sqlite';
import { spawn } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import type { AgentExecutionFailure, AgentExecutionRequest, AgentExecutionResult, AgentStrategy } from './agent-strategy.type';

type CommandResult = {
  stdout: string;
  stderr: string;
};

type RunResult = {
  sessionId: string;
};

type AssistantTextRow = {
  text: string;
};

type AssistantMessageRow = {
  id: string;
};

type RunCommand = (command: string, args: string[], workspace: string) => Promise<CommandResult>;

type ReadAssistantText = (sessionId: string) => Promise<string>;

type WaitForAssistantText = (sessionId: string) => Promise<string>;

export type OhMyOpencodeStrategyOptions = {
  runCommand?: RunCommand;
  readAssistantText?: ReadAssistantText;
  waitForAssistantText?: WaitForAssistantText;
  databasePath?: string;
  pollingAttempts?: number;
  pollingDelayMs?: number;
};

const OH_MY_OPENCODE_CLIENT = 'oh-my-opencode' as const;

const createFailureResult = (message: string): AgentExecutionFailure => ({
  ok: false,
  client: OH_MY_OPENCODE_CLIENT,
  code: 'execution_failed',
  message,
});

const extractLastJsonLine = <T>(output: string) => {
  const jsonLine = output
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .reverse()
    .find((line) => line.startsWith('{') && line.endsWith('}'));

  if (!jsonLine) {
    throw new Error('oh-my-opencode did not return a trailing JSON result line.');
  }

  try {
    return JSON.parse(jsonLine) as T;
  } catch {
    throw new Error('oh-my-opencode returned malformed JSON result output.');
  }
};

const getDefaultDatabasePath = () => join(homedir(), '.local', 'share', 'opencode', 'opencode.db');

const createReadAssistantText =
  (databasePath: string): ReadAssistantText =>
  async (sessionId) => {
    const database = new Database(databasePath, { readonly: true });

    try {
      const latestAssistantMessage = database
        .query<AssistantMessageRow, [string]>(
          `
          select id
          from message
          where session_id = ?
            and json_extract(data, '$.role') = 'assistant'
          order by time_created desc
          limit 1
        `,
        )
        .get(sessionId);

      if (!latestAssistantMessage) {
        throw new Error('No assistant message found in the local opencode session database.');
      }

      const assistantText = database
        .query<AssistantTextRow, [string]>(
          `
          select json_extract(data, '$.text') as text
          from part
          where message_id = ?
            and json_extract(data, '$.type') = 'text'
          order by time_created
        `,
        )
        .all(latestAssistantMessage.id)
        .map((row) => row.text)
        .join('')
        .trim();

      if (!assistantText) {
        throw new Error('No assistant text parts found in the local opencode session database.');
      }

      return assistantText;
    } finally {
      database.close();
    }
  };

const createWaitForAssistantText =
  (readAssistantText: ReadAssistantText, pollingAttempts: number, pollingDelayMs: number): WaitForAssistantText =>
  async (sessionId) => {
    for (let attempt = 0; attempt < pollingAttempts; attempt += 1) {
      try {
        return await readAssistantText(sessionId);
      } catch (error: unknown) {
        if (attempt === pollingAttempts - 1) {
          throw error;
        }

        await delay(pollingDelayMs);
      }
    }

    throw new Error('Failed to read assistant output from the local opencode session database.');
  };

const defaultRunCommand: RunCommand = (command, args, workspace) =>
  new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: workspace,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `${command} exited with code ${code}.`));
        return;
      }

      resolve({ stdout, stderr });
    });
  });

class OhMyOpencodeAgentStrategy implements AgentStrategy {
  readonly client = OH_MY_OPENCODE_CLIENT;

  constructor(
    private readonly runCommand: RunCommand,
    private readonly waitForAssistantText: WaitForAssistantText,
  ) {}

  async execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    void request.agent;

    try {
      const runOutput = await this.runCommand('bunx', ['oh-my-opencode', 'run', '--json', '--no-timestamp', request.prompt], request.workspace);

      const runResult = extractLastJsonLine<RunResult>(runOutput.stdout);

      if (typeof runResult.sessionId !== 'string' || runResult.sessionId.trim().length === 0) {
        throw new Error('oh-my-opencode did not return a valid sessionId.');
      }

      return {
        ok: true,
        client: this.client,
        output: await this.waitForAssistantText(runResult.sessionId),
      };
    } catch (error: unknown) {
      return createFailureResult(error instanceof Error ? error.message : String(error));
    }
  }
}

export const createOhMyOpencodeAgentStrategy = (options: OhMyOpencodeStrategyOptions = {}): AgentStrategy => {
  const pollingAttempts = options.pollingAttempts ?? 20;
  const pollingDelayMs = options.pollingDelayMs ?? 100;
  const databasePath = options.databasePath ?? getDefaultDatabasePath();
  const readAssistantText = options.readAssistantText ?? createReadAssistantText(databasePath);
  const waitForAssistantText = options.waitForAssistantText ?? createWaitForAssistantText(readAssistantText, pollingAttempts, pollingDelayMs);

  return new OhMyOpencodeAgentStrategy(options.runCommand ?? defaultRunCommand, waitForAssistantText);
};
