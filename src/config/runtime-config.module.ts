import { DynamicModule, Module } from '@nestjs/common';

import { loadRuntimeConfig } from './runtime-config';
import { RUNTIME_CONFIG, RuntimeConfigService } from './runtime-config.service';

export { RUNTIME_CONFIG, RuntimeConfigService } from './runtime-config.service';

@Module({})
export class RuntimeConfigModule {
  static forRoot(): DynamicModule {
    return {
      module: RuntimeConfigModule,
      providers: [
        {
          provide: RUNTIME_CONFIG,
          /** Load on bootstrap so tests and alternate config paths can override the source file. */
          useFactory: () => loadRuntimeConfig(),
        },
        RuntimeConfigService,
      ],
      exports: [RUNTIME_CONFIG, RuntimeConfigService],
    };
  }
}
