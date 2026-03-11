import type { AgentClient } from '../config/runtime-config';
import { AGENT_CLIENTS } from '../config/runtime-config.constants';

export { createOhMyOpencodeAgentStrategy } from './oh-my-opencode-strategy';

import { createOhMyOpencodeAgentStrategy } from './oh-my-opencode-strategy';

import type {
  AgentExecutionFailure,
  AgentExecutionFailureCode,
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentStrategy,
  AgentStrategyRegistry,
  ConfiguredAgentBot,
} from './agent-strategy.type';

const createFailureResult = (client: AgentClient, code: AgentExecutionFailureCode, message: string): AgentExecutionFailure => ({
  ok: false,
  client,
  code,
  message,
});

class PlaceholderAgentStrategy implements AgentStrategy {
  constructor(
    public readonly client: AgentClient,
    private readonly code: AgentExecutionFailureCode,
    private readonly message: string,
  ) {}

  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult> {
    void request;

    return Promise.resolve(createFailureResult(this.client, this.code, this.message));
  }
}

export const createNotImplementedAgentStrategy = (client: AgentClient): AgentStrategy =>
  new PlaceholderAgentStrategy(client, 'not_implemented', `Agent client "${client}" is not implemented yet.`);

export const createUnsupportedAgentStrategy = (client: AgentClient): AgentStrategy =>
  new PlaceholderAgentStrategy(client, 'unsupported_client', `Agent client "${client}" is not supported in this runtime yet.`);

export const createAgentStrategyRegistry = (overrides: Partial<AgentStrategyRegistry> = {}): AgentStrategyRegistry => ({
  'oh-my-opencode': createOhMyOpencodeAgentStrategy(),
  opencode: createUnsupportedAgentStrategy('opencode'),
  'claude-code': createUnsupportedAgentStrategy('claude-code'),
  codex: createUnsupportedAgentStrategy('codex'),
  ...overrides,
});

export const listRegisteredAgentClients = (registry: AgentStrategyRegistry): AgentClient[] => AGENT_CLIENTS.filter((client) => Boolean(registry[client]));

export const resolveAgentStrategy = (client: AgentClient, registry: AgentStrategyRegistry): AgentStrategy => registry[client];

export const resolveConfiguredAgentStrategy = (bot: ConfiguredAgentBot, registry: AgentStrategyRegistry): AgentStrategy =>
  resolveAgentStrategy(bot.client, registry);
