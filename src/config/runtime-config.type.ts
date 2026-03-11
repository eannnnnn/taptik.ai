export type AgentClient = 'oh-my-opencode' | 'opencode' | 'claude-code' | 'codex';

export type RuntimeBotConfig = {
  name: string;
  client: AgentClient;
  token: string;
  workspace: string;
  agent: string | null;
  ultrawork: boolean;
};

export type RuntimeConfig = {
  lang: string;
  configPath: string;
  bots: RuntimeBotConfig[];
};
