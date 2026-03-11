export const AGENT_CLIENTS = ['oh-my-opencode', 'opencode', 'claude-code', 'codex'] as const;

export const DEFAULT_RUNTIME_LANGUAGE = 'ko';

export const DEFAULT_RUNTIME_CONFIG_PATH = 'config.toml';

export const MISSING_RUNTIME_CONFIG_ERROR = 'Runtime config not found at %s. Copy config.toml.example to config.toml and update it for your environment.';

export const MISSING_BOTS_ERROR = 'Runtime config must define at least one bot under [bot.<name>].';
