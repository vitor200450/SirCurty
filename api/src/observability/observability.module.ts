import { Module, Global } from '@nestjs/common';
import { TracingService } from './tracing.service';

/**
 * Global module that exposes TracingService to every other module.
 * Import once in AppModule — no need to add to each feature module.
 */
@Global()
@Module({
  providers: [TracingService],
  exports: [TracingService],
})
export class ObservabilityModule {}
