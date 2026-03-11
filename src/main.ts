import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { basename } from 'node:path';

import { AppModule } from './app.module';

export const bootstrapApplication = async () => {
  const app = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(new Logger());

  return app;
};

const isMainModule = (() => {
  const entryPath = process.argv[1];

  if (!entryPath) {
    return false;
  }

  const entryFileName = basename(entryPath);

  // Keep imports side-effect free so tests can call bootstrapApplication explicitly.
  return entryFileName === 'main.ts' || entryFileName === 'main.js';
})();

if (isMainModule) {
  void bootstrapApplication().catch((error: unknown) => {
    const logger = new Logger('Bootstrap');
    const message = error instanceof Error ? error.message : String(error);
    logger.error(message);
    process.exitCode = 1;
  });
}
