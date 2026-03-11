import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'bun:test';

import { RuntimeConfigService } from '../../src/config/runtime-config.module';
import { bootstrapApplication } from '../../src/main';

const createTempConfig = () => {
  const directoryPath = mkdtempSync(join(tmpdir(), 'taptik-bootstrap-'));
  const filePath = join(directoryPath, 'config.toml');

  writeFileSync(
    filePath,
    `LANG = "ko"

[bot.taptik]
client = "oh-my-opencode"
token = "discord-token"
workspace = "./bots/taptik"
ultrawork = false
`,
    'utf8',
  );

  return {
    filePath,
    cleanup: () => rmSync(directoryPath, { recursive: true, force: true }),
  };
};

describe('bootstrapApplication', () => {
  it('boots a Nest application context with runtime config loaded', async () => {
    const config = createTempConfig();
    const previousConfigPath = process.env.TAPTIK_CONFIG_PATH;
    process.env.TAPTIK_CONFIG_PATH = config.filePath;

    try {
      const app = await bootstrapApplication();

      try {
        const runtimeConfigService = app.get(RuntimeConfigService);

        expect(runtimeConfigService.listBots()).toHaveLength(1);
        expect(runtimeConfigService.listBots()[0]?.name).toBe('taptik');
      } finally {
        await app.close();
      }
    } finally {
      if (previousConfigPath === undefined) {
        delete process.env.TAPTIK_CONFIG_PATH;
      } else {
        process.env.TAPTIK_CONFIG_PATH = previousConfigPath;
      }

      config.cleanup();
    }
  });
});
