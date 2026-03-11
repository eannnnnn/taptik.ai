export {
  createAgentStrategyRegistry,
  createNotImplementedAgentStrategy,
  createOhMyOpencodeAgentStrategy,
  createUnsupportedAgentStrategy,
  listRegisteredAgentClients,
  resolveAgentStrategy,
  resolveConfiguredAgentStrategy,
} from './agent-strategy.library';

export type {
  AgentExecutionFailure,
  AgentExecutionFailureCode,
  AgentExecutionRequest,
  AgentExecutionResult,
  AgentExecutionSuccess,
  AgentStrategy,
  AgentStrategyRegistry,
  ConfiguredAgentBot,
} from './agent-strategy.type';
