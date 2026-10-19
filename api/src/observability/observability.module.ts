import {
  Global,
  Injectable,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import { shutdownTracing } from './tracing.js';
import { TracingService } from './tracing.service.js';

@Injectable()
class TracingShutdownService implements OnApplicationShutdown {
  async onApplicationShutdown(): Promise<void> {
    await shutdownTracing();
  }
}

@Global()
@Module({
  providers: [TracingService, TracingShutdownService],
  exports: [TracingService],
})
export class ObservabilityModule {}
