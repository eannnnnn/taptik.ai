import { Database } from 'bun:sqlite';
import { describe, expect, it, mock } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { AgentExecutionRequest } from '../../src/agents/agent-strategy';
import { createOhMyOpencodeAgentStrategy } from '../../src/agents/oh-my-opencode-strategy';

const request: AgentExecutionRequest = {
  prompt: 'Ship the feature',
  workspace: '/tmp/taptik-workspace',
  agent: 'Hephaestus',
};

const createTempDatabasePath = () => {
  const directory = mkdtempSync(join(tmpdir(), 'taptik-omo-'));

  return {
    directory,
    databasePath: join(directory, 'opencode.db'),
  };
};

const initializeSessionDatabase = (databasePath: string) => {
  const database = new Database(databasePath);

  database.exec(`
    create table message (
      id text primary key,
      session_id text not null,
      data text not null,
      time_created integer not null
    );

    create table part (
      message_id text not null,
      data text not null,
      time_created integer not null
    );
  `);

  return database;
};

const insertAssistantMessage = (database: Database, sessionId: string, messageId: string, textParts: string[]) => {
  database
    .query<unknown, [string, string, string, number]>('insert into message (id, session_id, data, time_created) values (?, ?, ?, ?)')
    .run(messageId, sessionId, JSON.stringify({ role: 'assistant' }), 1);

  textParts.forEach((text, index) => {
    database
      .query<unknown, [string, string, number]>('insert into part (message_id, data, time_created) values (?, ?, ?)')
      .run(messageId, JSON.stringify({ type: 'text', text }), index + 1);
  });
};

describe('oh-my-opencode strategy', () => {
  it('runs the oh-my-opencode command in the configured workspace and returns assistant output', async () => {
    const runCommand = mock(async (command: string, args: string[], workspace: string) => {
      expect(command).toBe('bunx');
      expect(args).toEqual(['oh-my-opencode', 'run', '--json', '--no-timestamp', 'Ship the feature']);
      expect(workspace).toBe('/tmp/taptik-workspace');

      return {
        stdout: 'progress\n{"sessionId":"session-123"}\n',
        stderr: '',
      };
    });
    const waitForAssistantText = mock(async (sessionId: string) => {
      expect(sessionId).toBe('session-123');
      return 'Feature shipped';
    });

    const strategy = createOhMyOpencodeAgentStrategy({
      runCommand,
      waitForAssistantText,
    });

    return expect(
      strategy.execute({
        ...request,
        agent: null,
      }),
    ).resolves.toEqual({
      ok: true,
      client: 'oh-my-opencode',
      output: 'Feature shipped',
    });
  });

  it('passes the configured agent name through to the oh-my-opencode CLI', async () => {
    const runCommand = mock(async (command: string, args: string[], workspace: string) => {
      expect(command).toBe('bunx');
      expect(args).toEqual(['oh-my-opencode', 'run', '--json', '--no-timestamp', '--agent', 'Hephaestus', 'Ship the feature']);
      expect(workspace).toBe('/tmp/taptik-workspace');

      return {
        stdout: '{"sessionId":"session-123"}\n',
        stderr: '',
      };
    });

    const strategy = createOhMyOpencodeAgentStrategy({
      runCommand,
      waitForAssistantText: async () => 'Feature shipped',
    });

    return expect(strategy.execute(request)).resolves.toEqual({
      ok: true,
      client: 'oh-my-opencode',
      output: 'Feature shipped',
    });
  });

  it('omits the agent flag when no explicit agent is configured', async () => {
    const runCommand = mock(async (command: string, args: string[], workspace: string) => {
      expect(command).toBe('bunx');
      expect(args).toEqual(['oh-my-opencode', 'run', '--json', '--no-timestamp', 'Ship the feature']);
      expect(workspace).toBe('/tmp/taptik-workspace');

      return {
        stdout: '{"sessionId":"session-123"}\n',
        stderr: '',
      };
    });

    const strategy = createOhMyOpencodeAgentStrategy({
      runCommand,
      waitForAssistantText: async () => 'Feature shipped',
    });

    return expect(
      strategy.execute({
        ...request,
        agent: null,
      }),
    ).resolves.toEqual({
      ok: true,
      client: 'oh-my-opencode',
      output: 'Feature shipped',
    });
  });

  it('returns a deterministic failure when the command output has no trailing JSON line', async () => {
    const strategy = createOhMyOpencodeAgentStrategy({
      runCommand: async () => ({
        stdout: 'plain output only',
        stderr: '',
      }),
      waitForAssistantText: async () => 'unused',
    });

    return expect(strategy.execute(request)).resolves.toEqual({
      ok: false,
      client: 'oh-my-opencode',
      code: 'execution_failed',
      message: 'oh-my-opencode did not return a trailing JSON result line.',
    });
  });

  it('returns a deterministic failure when the trailing JSON line is malformed', async () => {
    const strategy = createOhMyOpencodeAgentStrategy({
      runCommand: async () => ({
        stdout: '{"sessionId":}\n',
        stderr: '',
      }),
      waitForAssistantText: async () => 'unused',
    });

    return expect(strategy.execute(request)).resolves.toEqual({
      ok: false,
      client: 'oh-my-opencode',
      code: 'execution_failed',
      message: 'oh-my-opencode returned malformed JSON result output.',
    });
  });

  it('returns a deterministic failure when the session result is missing a sessionId', async () => {
    const strategy = createOhMyOpencodeAgentStrategy({
      runCommand: async () => ({
        stdout: '{"unexpected":true}\n',
        stderr: '',
      }),
      waitForAssistantText: async () => 'unused',
    });

    return expect(strategy.execute(request)).resolves.toEqual({
      ok: false,
      client: 'oh-my-opencode',
      code: 'execution_failed',
      message: 'oh-my-opencode did not return a valid sessionId.',
    });
  });

  it('returns a deterministic failure when reading assistant text fails', async () => {
    const strategy = createOhMyOpencodeAgentStrategy({
      runCommand: async () => ({
        stdout: '{"sessionId":"session-123"}\n',
        stderr: '',
      }),
      waitForAssistantText: async () => {
        throw new Error('No assistant message found in the local opencode session database.');
      },
    });

    return expect(strategy.execute(request)).resolves.toEqual({
      ok: false,
      client: 'oh-my-opencode',
      code: 'execution_failed',
      message: 'No assistant message found in the local opencode session database.',
    });
  });

  it('returns a deterministic failure when the command exits with an error', async () => {
    const strategy = createOhMyOpencodeAgentStrategy({
      runCommand: async () => {
        throw new Error('spawn bunx ENOENT');
      },
      waitForAssistantText: async () => 'unused',
    });

    return expect(strategy.execute(request)).resolves.toEqual({
      ok: false,
      client: 'oh-my-opencode',
      code: 'execution_failed',
      message: 'spawn bunx ENOENT',
    });
  });

  it('reads assistant text from the local opencode sqlite session database', async () => {
    const { databasePath, directory } = createTempDatabasePath();
    const database = initializeSessionDatabase(databasePath);

    try {
      insertAssistantMessage(database, 'sqlite-session', 'message-1', ['Feature ', 'shipped from sqlite']);

      const strategy = createOhMyOpencodeAgentStrategy({
        databasePath,
        runCommand: async () => ({
          stdout: '{"sessionId":"sqlite-session"}\n',
          stderr: '',
        }),
      });

      return expect(strategy.execute(request)).resolves.toEqual({
        ok: true,
        client: 'oh-my-opencode',
        output: 'Feature shipped from sqlite',
      });
    } finally {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it('retries the sqlite read path until assistant text becomes available', async () => {
    const { databasePath, directory } = createTempDatabasePath();
    const database = initializeSessionDatabase(databasePath);

    try {
      const strategy = createOhMyOpencodeAgentStrategy({
        databasePath,
        pollingAttempts: 5,
        pollingDelayMs: 10,
        runCommand: async () => ({
          stdout: '{"sessionId":"delayed-session"}\n',
          stderr: '',
        }),
      });

      setTimeout(() => {
        insertAssistantMessage(database, 'delayed-session', 'message-2', ['Delayed sqlite output']);
      }, 15);

      return expect(strategy.execute(request)).resolves.toEqual({
        ok: true,
        client: 'oh-my-opencode',
        output: 'Delayed sqlite output',
      });
    } finally {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
