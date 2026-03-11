import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { basename } from 'node:path';

import { RuntimeConfigService } from '../config/runtime-config.module';

@Injectable()
export class BootstrapReporterService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapReporterService.name);

  constructor(private readonly runtimeConfigService: RuntimeConfigService) {}

  onApplicationBootstrap() {
    const botNames = this.runtimeConfigService
      .listBots()
      .map((bot) => bot.name)
      .join(', ');

    this.logger.log(`Loaded ${this.runtimeConfigService.listBots().length} bot config(s) from ${basename(this.runtimeConfigService.configPath)}: ${botNames}`);
  }
}
