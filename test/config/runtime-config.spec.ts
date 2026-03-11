import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { describe, expect, it } from 'bun:test';

import { loadRuntimeConfig } from '../../src/config/runtime-config';

const createTempConfig = (contents: string) => {
  const directoryPath = mkdtempSync(join(tmpdir(), 'taptik-config-'));
  const filePath = join(directoryPath, 'config.toml');
  writeFileSync(filePath, contents, 'utf8');

  return {
    filePath,
    cleanup: () => rmSync(directoryPath, { recursive: true, force: true }),
  };
};

describe('loadRuntimeConfig', () => {
  it('parses bots and expands home-relative workspaces', () => {
    const config = createTempConfig(`
LANG = "ko"

[bot.research]
client = "oh-my-opencode"
token = "discord-token"
workspace = "~/bots/research"
agent = "Hephaestus"
ultrawork = true
`);

    try {
      const runtimeConfig = loadRuntimeConfig(config.filePath);

      expect(runtimeConfig.lang).toBe('ko');
      expect(runtimeConfig.bots).toHaveLength(1);
      expect(runtimeConfig.bots[0]).toMatchObject({
        name: 'research',
        client: 'oh-my-opencode',
        token: 'discord-token',
        agent: 'Hephaestus',
        ultrawork: true,
      });
      expect(runtimeConfig.bots[0]?.workspace.endsWith('/bots/research')).toBeTrue();
    } finally {
      config.cleanup();
    }
  });

  it('resolves relative workspaces from the config directory', () => {
    const config = createTempConfig(`
LANG = "ko"

[bot.research]
client = "oh-my-opencode"
token = "discord-token"
workspace = "./bots/research"
`);

    try {
      const runtimeConfig = loadRuntimeConfig(config.filePath);

      expect(runtimeConfig.bots[0]?.workspace).toBe(resolve(config.filePath, '..', 'bots', 'research'));
    } finally {
      config.cleanup();
    }
  });

  it('rejects configs without bots', () => {
    const config = createTempConfig('LANG = "ko"\n');

    try {
      expect(() => loadRuntimeConfig(config.filePath)).toThrow();
    } finally {
      config.cleanup();
    }
  });
});
