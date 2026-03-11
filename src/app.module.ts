import { Module } from '@nestjs/common';

import { RuntimeConfigModule } from './config/runtime-config.module';
import { BootstrapReporterService } from './runtime/bootstrap-reporter.service';

@Module({
  imports: [RuntimeConfigModule.forRoot()],
  providers: [BootstrapReporterService],
})
export class AppModule {}
