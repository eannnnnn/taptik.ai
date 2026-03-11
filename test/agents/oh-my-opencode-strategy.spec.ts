import { describe, expect, it, mock } from 'bun:test';

import type { AgentExecutionRequest } from '../../src/agents/agent-strategy';
import { createOhMyOpencodeAgentStrategy } from '../../src/agents/oh-my-opencode-strategy';

const request: AgentExecutionRequest = {
  prompt: 'Ship the feature',
  workspace: '/tmp/taptik-workspace',
  agent: 'Hephaestus',
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

    return expect(strategy.execute(request)).resolves.toEqual({
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
});
