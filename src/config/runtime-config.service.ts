import { Inject, Injectable } from '@nestjs/common';

import type { RuntimeBotConfig, RuntimeConfig } from './runtime-config';

export const RUNTIME_CONFIG = Symbol('RUNTIME_CONFIG');

@Injectable()
export class RuntimeConfigService {
  constructor(@Inject(RUNTIME_CONFIG) private readonly runtimeConfig: RuntimeConfig) {}

  get config() {
    return this.runtimeConfig;
  }

  get configPath() {
    return this.runtimeConfig.configPath;
  }

  get lang() {
    return this.runtimeConfig.lang;
  }

  listBots(): RuntimeBotConfig[] {
    return this.runtimeConfig.bots;
  }
}
