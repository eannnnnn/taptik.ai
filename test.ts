import { Database } from 'bun:sqlite';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const prompt = process.argv.slice(2).join(' ') || 'hi';

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

const extractLastJsonLine = <T>(output: string) => {
  const jsonLine = output
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .reverse()
    .find((line) => line.startsWith('{') && line.endsWith('}'));

  if (!jsonLine) {
    throw new Error('Could not find a trailing JSON line in the command output.');
  }

  return JSON.parse(jsonLine) as T;
};

const runCommand = (command: string, args: string[]) =>
  new Promise<CommandResult>((resolve, reject) => {
    const child = spawn(command, args);

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr || stdout || `${command} exited with code ${code}.`));
        return;
      }

      resolve({ stdout, stderr });
    });
  });

const getDatabasePath = () => join(process.env.HOME ?? '', '.local', 'share', 'opencode', 'opencode.db');

const readAssistantText = async (sessionId: string) => {
  const db = new Database(getDatabasePath(), { readonly: true });

  try {
    const latestAssistantMessage = db
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
      throw new Error('No assistant message found in the local session database.');
    }

    const assistantText = db
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
      throw new Error('No assistant text parts found in the local session database.');
    }

    return assistantText;
  } finally {
    db.close();
  }
};

const waitForAssistantText = async (sessionId: string) => {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      return await readAssistantText(sessionId);
    } catch (error: unknown) {
      if (attempt === 19) {
        throw error;
      }

      await delay(100);
    }
  }

  throw new Error('Failed to read the assistant text from the local session database.');
};

const main = async () => {
  const runOutput = await runCommand('bunx', ['oh-my-opencode', 'run', '--json', '--no-timestamp', prompt]);
  const runResult = extractLastJsonLine<RunResult>(runOutput.stdout);
  console.log(await waitForAssistantText(runResult.sessionId));
};

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
