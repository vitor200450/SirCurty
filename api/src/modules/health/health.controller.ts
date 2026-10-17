import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

/**
 * Health check endpoints for Kubernetes liveness and readiness probes.
 * Mounted at /health/* — excluded from the global /api prefix in main.ts.
 *
 * /health/live  — liveness probe: confirms the Node process is running.
 * /health/ready — readiness probe: confirms the app can serve traffic,
 *                 including a verified database connection.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /health/live
   * Returns 200 as long as the process is alive.
   * Never queries the database — a slow DB must not take down the pod.
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  live(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * GET /health/ready
   * Returns 200 if the application is ready to serve traffic.
   * Executes a lightweight SELECT 1 to confirm the database is reachable.
   * Returns 503 on any database error, without exposing internal details.
   */
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async ready(): Promise<{ status: string; db: string }> {
    try {
      // Minimal query — verified by the DB engine with near-zero overhead.
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', db: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database is not reachable');
    }
  }
}
