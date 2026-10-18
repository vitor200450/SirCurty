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

const PRISMA_ERROR_MAP: Record<
  string,
  { statusCode: number; message: string }
> = {
  P2002: {
    statusCode: HttpStatus.CONFLICT,
    message: 'Este recurso já existe.',
  },
  P2025: {
    statusCode: HttpStatus.NOT_FOUND,
    message: 'Recurso não encontrado.',
  },
  P2003: {
    statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    message: 'O recurso relacionado não foi encontrado.',
  },
  P2011: {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Um campo obrigatório não foi informado.',
  },
  P2000: {
    statusCode: HttpStatus.BAD_REQUEST,
    message: 'Um dos valores informados é muito longo.',
  },
};

const VALIDATION_MESSAGES: Record<string, string> = {
  'should not be empty': 'não pode ficar vazio',
  'should not be null or undefined': 'é obrigatório',
  'must be a string': 'deve ser um texto',
  'must be a number conforming to the specified constraints':
    'deve ser um número válido',
  'must be an integer number': 'deve ser um número inteiro',
  'must be a boolean value': 'deve ser verdadeiro ou falso',
  'must be a valid URL': 'deve ser uma URL válida',
  'must be a valid ISO 8601 date string':
    'deve ser uma data válida no formato ISO 8601',
  'must be a URL address': 'deve ser um endereço URL válido',
  'must be shorter than or equal to 32 characters':
    'deve ter no máximo 32 caracteres',
  'must be longer than or equal to 3 characters':
    'deve ter pelo menos 3 caracteres',
  'must be shorter than or equal to 128 characters':
    'deve ter no máximo 128 caracteres',
  'property should not exist': 'contém uma propriedade não permitida',
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

  private translateValidationMessage(message: string): string {
    let translated = message;

    for (const [english, portuguese] of Object.entries(VALIDATION_MESSAGES)) {
      translated = translated.replaceAll(english, portuguese);
    }

    return translated;
  }

  private translateMessage(message: string | string[]): string | string[] {
    if (Array.isArray(message)) {
      return message.map((item) => this.translateValidationMessage(item));
    }

    return this.translateValidationMessage(message);
  }

  private resolve(
    exception: unknown,
    path: string,
  ): { statusCode: number; message: string | string[] } {
    // Exceções HTTP do NestJS
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        return {
          statusCode: status,
          message: this.translateMessage(res),
        };
      }

      if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        const msg = body['message'];

        if (Array.isArray(msg)) {
          const messages = msg.filter(
            (item): item is string => typeof item === 'string',
          );

          return {
            statusCode: status,
            message: this.translateMessage(messages),
          };
        }

        if (typeof msg === 'string') {
          return {
            statusCode: status,
            message: this.translateMessage(msg),
          };
        }
      }

      return {
        statusCode: status,
        message: this.translateMessage(exception.message),
      };
    }

    // Erros conhecidos do Prisma
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      const mapped = PRISMA_ERROR_MAP[exception.code];

      if (mapped) {
        this.logger.warn(
          `Erro Prisma ${exception.code} em ${path}: ${exception.message}`,
        );

        return mapped;
      }

      this.logger.error(
        `Erro Prisma não mapeado ${exception.code} em ${path}`,
        exception.stack,
      );

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ocorreu um erro interno no servidor.',
      };
    }

    // Erros de validação interna do Prisma
    if (exception instanceof Prisma.PrismaClientValidationError) {
      this.logger.error(
        `Erro de validação do Prisma em ${path}`,
        exception.message,
      );

      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ocorreu um erro interno no servidor.',
      };
    }

    // Erros de inicialização ou conexão do Prisma
    if (exception instanceof Prisma.PrismaClientInitializationError) {
      this.logger.error(
        `Erro de inicialização do Prisma em ${path}`,
        exception.message,
      );

      return {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message:
          'Serviço temporariamente indisponível. Tente novamente mais tarde.',
      };
    }

    // Exceções desconhecidas
    this.logger.error(
      `Exceção não tratada em ${path}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ocorreu um erro interno no servidor.',
    };
  }
}
