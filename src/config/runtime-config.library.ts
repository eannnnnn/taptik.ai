import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, isAbsolute, resolve } from 'node:path';

import { parse } from 'toml';

import { DEFAULT_RUNTIME_CONFIG_PATH, MISSING_BOTS_ERROR, MISSING_RUNTIME_CONFIG_ERROR } from './runtime-config.constants';
import { rawRuntimeConfigSchema, type RawRuntimeConfig } from './runtime-config.schema';
import type { RuntimeConfig } from './runtime-config.type';

/** Resolve which runtime config file should be loaded for this process. */
export const resolveRuntimeConfigPath = (configPath = process.env.TAPTIK_CONFIG_PATH) => {
  if (configPath && configPath.trim().length > 0) {
    return resolve(process.cwd(), configPath);
  }

  return resolve(process.cwd(), DEFAULT_RUNTIME_CONFIG_PATH);
};

/** Normalize workspace paths from config values into absolute filesystem paths. */
const resolveWorkspacePath = (workspace: string, configPath: string) => {
  if (workspace === '~') {
    return homedir();
  }

  if (workspace.startsWith('~/')) {
    return resolve(homedir(), workspace.slice(2));
  }

  return isAbsolute(workspace) ? workspace : resolve(dirname(configPath), workspace);
};

/** Convert parsed TOML data into the runtime shape used by the application. */
const normalizeRuntimeConfig = (parsedConfig: RawRuntimeConfig, configPath: string): RuntimeConfig => {
  const rawBots = parsedConfig.bot ?? {};
  const bots = Object.entries(rawBots).map(([name, botConfig]) => ({
    name,
    client: botConfig.client,
    token: botConfig.token,
    workspace: resolveWorkspacePath(botConfig.workspace, configPath),
    agent: botConfig.agent,
    ultrawork: botConfig.ultrawork,
  }));

  if (bots.length === 0) {
    throw new Error(MISSING_BOTS_ERROR);
  }

  return {
    lang: parsedConfig.LANG,
    configPath,
    bots,
  };
};

/** Read, parse, validate, and normalize the runtime config file. */
export const loadRuntimeConfig = (configPath = resolveRuntimeConfigPath()) => {
  if (!existsSync(configPath)) {
    throw new Error(MISSING_RUNTIME_CONFIG_ERROR.replace('%s', configPath));
  }

  const rawConfigText = readFileSync(configPath, 'utf8');
  const parsedToml = parse(rawConfigText) as Record<string, unknown>;
  const parsedConfig = rawRuntimeConfigSchema.parse(parsedToml);

  return normalizeRuntimeConfig(parsedConfig, configPath);
};
