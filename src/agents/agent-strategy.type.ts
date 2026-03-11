import type { AgentClient } from '../config/runtime-config';

export type AgentExecutionRequest = {
  prompt: string;
  workspace: string;
  agent: string | null;
};

export type AgentExecutionSuccess = {
  ok: true;
  client: AgentClient;
  output: string;
};

export type AgentExecutionFailureCode = 'execution_failed' | 'not_implemented' | 'unsupported_client';

export type AgentExecutionFailure = {
  ok: false;
  client: AgentClient;
  code: AgentExecutionFailureCode;
  message: string;
};

export type AgentExecutionResult = AgentExecutionSuccess | AgentExecutionFailure;

export interface AgentStrategy {
  readonly client: AgentClient;
  execute(request: AgentExecutionRequest): Promise<AgentExecutionResult>;
}

export type AgentStrategyRegistry = Record<AgentClient, AgentStrategy>;

export type ConfiguredAgentBot = {
  client: AgentClient;
};
