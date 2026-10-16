import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

/**
 * Prisma error codes mapped to HTTP status + user-facing message.
 * Only codes that can reasonably occur in the link-shortener domain are handled.
 * Unknown codes fall through to 500.
 *
 * Reference: https://www.prisma.io/docs/reference/api-reference/error-reference
 */
const PRISMA_ERROR_MAP: Record<string, { statusCode: number; message: string }> = {
  // Unique constraint violation (slug/email already taken)
  P2002: { statusCode: HttpStatus.CONFLICT, message: 'Resource already exists' },
  // Record not found (findUniqueOrThrow / updateOrThrow)
  P2025: { statusCode: HttpStatus.NOT_FOUND, message: 'Resource not found' },
  // Foreign key constraint violation
  P2003: { statusCode: HttpStatus.UNPROCESSABLE_ENTITY, message: 'Related resource not found' },
  // Required field missing at the query level
  P2011: { statusCode: HttpStatus.BAD_REQUEST, message: 'Missing required field' },
  // Value too long for column type
  P2000: { statusCode: HttpStatus.BAD_REQUEST, message: 'Input value is too long' },
};

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  timestamp: string;
  path: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { statusCode, message } = this.resolve(exception, request.url);

    const body: ErrorResponse = {
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }

  private resolve(
    exception: unknown,
    path: string,
  ): { statusCode: number; message: string | string[] } {
    // ── NestJS HttpException ──────────────────────────────────────────────
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      // res can be: string | { message: string | string[]; error?: string; statusCode?: number }
      if (typeof res === 'string') {
        return { statusCode: status, message: res };
      }

      if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        const msg = body['message'];

        // ValidationPipe produces message as string[] — preserve the array
        if (Array.isArray(msg)) {
          return { statusCode: status, message: msg as string[] };
        }

        if (typeof msg === 'string') {
          return { statusCode: status, message: msg };
        }
      }

      // Fallback to the exception's own message
      return { statusCode: status, message: exception.message };
    }

    // ── Prisma known request errors ───────────────────────────────────────
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_ERROR_MAP[exception.code];
      if (mapped) {
        this.logger.warn(
          `Prisma ${exception.code} at ${path}: ${exception.message}`,
        );
        return mapped;
      }
      // Unmapped Prisma error → 500, no internal detail exposed
      this.logger.error(
        `Unmapped Prisma error ${exception.code} at ${path}`,
        exception.stack,
      );
      return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
    }

    // ── Prisma validation error (bad query shape, not user input) ─────────
    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(`Prisma validation error at ${path}`, exception.message);
      return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
    }

    // ── Prisma initialization error ───────────────────────────────────────
    if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(`Prisma initialization error at ${path}`, exception.message);
      return { statusCode: HttpStatus.SERVICE_UNAVAILABLE, message: 'Service temporarily unavailable' };
    }

    // ── Unknown / unhandled ───────────────────────────────────────────────
    this.logger.error(
      `Unhandled exception at ${path}`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
