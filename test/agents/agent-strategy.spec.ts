import { describe, expect, it } from 'bun:test';

import type { AgentExecutionRequest, AgentExecutionResult, AgentStrategy } from '../../src/agents/agent-strategy';
import { createAgentStrategyRegistry, listRegisteredAgentClients, resolveAgentStrategy, resolveConfiguredAgentStrategy } from '../../src/agents/agent-strategy';

const request: AgentExecutionRequest = {
  prompt: 'hello',
  workspace: '/tmp/workspace',
  agent: 'Hephaestus',
};

describe('agent strategy registry', () => {
  it('lists all configured agent clients through one registry boundary', () => {
    const registry = createAgentStrategyRegistry();

    expect(listRegisteredAgentClients(registry)).toEqual(['oh-my-opencode', 'opencode', 'claude-code', 'codex']);
  });

  it('resolves the configured bot strategy without caller-side client branching', () => {
    const strategy: AgentStrategy = {
      client: 'oh-my-opencode',
      execute: (): Promise<AgentExecutionResult> =>
        Promise.resolve({
          ok: true,
          client: 'oh-my-opencode',
          output: 'done',
        }),
    };

    const registry = createAgentStrategyRegistry({
      'oh-my-opencode': strategy,
    });

    expect(
      resolveConfiguredAgentStrategy(
        {
          client: 'oh-my-opencode',
        },
        registry,
      ),
    ).toBe(strategy);
  });

  it('uses the concrete oh-my-opencode strategy by default', () => {
    const registry = createAgentStrategyRegistry();

    return expect(
      resolveAgentStrategy('oh-my-opencode', registry).execute({
        ...request,
        workspace: '/definitely/missing/taptik-workspace',
      }),
    ).resolves.toMatchObject({
      ok: false,
      client: 'oh-my-opencode',
      code: 'execution_failed',
    });
  });

  it('returns a clear unsupported failure for future clients', async () => {
    const registry = createAgentStrategyRegistry();
    const result = await resolveAgentStrategy('codex', registry).execute(request);

    expect(result).toEqual({
      ok: false,
      client: 'codex',
      code: 'unsupported_client',
      message: 'Agent client "codex" is not supported in this runtime yet.',
    });
  });
});
