import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client.js';
import { HttpExceptionFilter, ErrorResponse } from './http-exception.filter.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeHost(url = '/api/test'): ArgumentsHost {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const getResponse = jest.fn().mockReturnValue({ status });
  const getRequest = jest.fn().mockReturnValue({ url });
  return {
    switchToHttp: jest.fn().mockReturnValue({ getResponse, getRequest }),
  } as unknown as ArgumentsHost;
}

function captureResponse(host: ArgumentsHost): jest.Mock {
  const http = host.switchToHttp();
  const response = http.getResponse<{ status: jest.Mock }>();
  return response.status;
}

function getBody(host: ArgumentsHost): ErrorResponse {
  const http = host.switchToHttp();
  const res = http.getResponse<{ status: jest.Mock }>();
  const jsonMock = res.status.mock.results[0]?.value as
    { json: jest.Mock } | undefined;
  return jsonMock?.json.mock.calls[0]?.[0] as ErrorResponse;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    warnSpy = jest
      .spyOn(filter['logger'], 'warn')
      .mockImplementation(() => undefined);
    errorSpy = jest
      .spyOn(filter['logger'], 'error')
      .mockImplementation(() => undefined);
  });

  // ── Response shape ────────────────────────────────────────────────────

  it('always includes statusCode, message, timestamp, path', () => {
    const host = makeHost('/api/links');
    filter.catch(
      new HttpException('bad request', HttpStatus.BAD_REQUEST),
      host,
    );
    const body = getBody(host);
    expect(body).toMatchObject({
      statusCode: 400,
      message: 'bad request',
      path: '/api/links',
    });
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp).getTime()).not.toBeNaN();
  });

  // ── HttpException — string message ────────────────────────────────────

  it('returns string message from HttpException', () => {
    const host = makeHost();
    filter.catch(new HttpException('Not found', HttpStatus.NOT_FOUND), host);
    const statusMock = captureResponse(host);
    expect(statusMock).toHaveBeenCalledWith(404);
    expect(getBody(host).message).toBe('Not found');
  });

  // ── HttpException — array message (ValidationPipe shape) ─────────────

  it('preserves message array from ValidationPipe', () => {
    const host = makeHost();
    const errors = ['url must be a URL address', 'url should not be empty'];
    filter.catch(
      new HttpException(
        { message: errors, error: 'Bad Request', statusCode: 400 },
        HttpStatus.BAD_REQUEST,
      ),
      host,
    );
    expect(captureResponse(host)).toHaveBeenCalledWith(400);
    expect(getBody(host).message).toEqual([
      'url deve ser um endereço URL válido',
      'url não pode ficar vazio',
    ]);
  });

  // ── HttpException — object message as string ──────────────────────────

  it('extracts string from object response', () => {
    const host = makeHost();
    filter.catch(
      new HttpException(
        { message: 'Forbidden resource' },
        HttpStatus.FORBIDDEN,
      ),
      host,
    );
    expect(captureResponse(host)).toHaveBeenCalledWith(403);
    expect(getBody(host).message).toBe('Forbidden resource');
  });

  // ── HttpException — fallback to exception.message ────────────────────

  it('falls back to exception.message when response object has no message key', () => {
    const host = makeHost();
    filter.catch(
      new HttpException({ detail: 'something' }, HttpStatus.CONFLICT),
      host,
    );
    expect(captureResponse(host)).toHaveBeenCalledWith(409);
    // NestJS sets exception.message to HTTP status text when no string is passed
    expect(typeof getBody(host).message).toBe('string');
  });

  // ── Prisma P2002 — unique constraint ─────────────────────────────────

  it('maps P2002 to 409 Conflict', () => {
    const host = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      { code: 'P2002', clientVersion: '7.0.0', meta: { target: ['slug'] } },
    );
    filter.catch(err, host);
    expect(captureResponse(host)).toHaveBeenCalledWith(409);
    expect(getBody(host).message).toBe('Este recurso já existe.');
  });

  // ── Prisma P2025 — record not found ───────────────────────────────────

  it('maps P2025 to 404 Not Found', () => {
    const host = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '7.0.0',
      meta: {},
    });
    filter.catch(err, host);
    expect(captureResponse(host)).toHaveBeenCalledWith(404);
    expect(getBody(host).message).toBe('Recurso não encontrado.');
  });

  // ── Prisma P2003 — foreign key ────────────────────────────────────────

  it('maps P2003 to 422 Unprocessable Entity', () => {
    const host = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError(
      'Foreign key constraint failed',
      { code: 'P2003', clientVersion: '7.0.0', meta: {} },
    );
    filter.catch(err, host);
    expect(captureResponse(host)).toHaveBeenCalledWith(422);
  });

  // ── Prisma unknown code — unmapped → 500 ─────────────────────────────

  it('maps unknown Prisma error code to 500', () => {
    const host = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError(
      'Something unexpected',
      { code: 'P9999', clientVersion: '7.0.0', meta: {} },
    );
    filter.catch(err, host);
    expect(captureResponse(host)).toHaveBeenCalledWith(500);
    expect(getBody(host).message).toBe('Ocorreu um erro interno no servidor.');
  });

  // ── PrismaClientValidationError → 500, no detail ─────────────────────

  it('maps PrismaClientValidationError to 500 without exposing details', () => {
    const host = makeHost();
    const err = new Prisma.PrismaClientValidationError(
      'SELECT syntax error near FROM',
      { clientVersion: '7.0.0' },
    );
    filter.catch(err, host);
    expect(captureResponse(host)).toHaveBeenCalledWith(500);
    expect(getBody(host).message).toBe('Ocorreu um erro interno no servidor.');
    // Must not expose SQL or internal detail
    expect(JSON.stringify(getBody(host))).not.toContain('SELECT');
  });

  // ── PrismaClientInitializationError → 503 ────────────────────────────

  it('maps PrismaClientInitializationError to 503', () => {
    const host = makeHost();
    const err = new Prisma.PrismaClientInitializationError(
      'Connection refused',
      '7.0.0',
    );
    filter.catch(err, host);
    expect(captureResponse(host)).toHaveBeenCalledWith(503);
    expect(getBody(host).message).toBe(
      'Serviço temporariamente indisponível. Tente novamente mais tarde.',
    );
  });

  // ── Unknown Error → 500, no stack trace ──────────────────────────────

  it('maps generic Error to 500 without exposing stack trace', () => {
    const host = makeHost();
    filter.catch(new Error('internal crash'), host);
    expect(captureResponse(host)).toHaveBeenCalledWith(500);
    const body = getBody(host);
    expect(body.message).toBe('Ocorreu um erro interno no servidor.');
    expect(JSON.stringify(body)).not.toContain('internal crash');
  });

  it('maps non-Error throw to 500', () => {
    const host = makeHost();
    filter.catch('something weird', host);
    expect(captureResponse(host)).toHaveBeenCalledWith(500);
    expect(getBody(host).message).toBe('Ocorreu um erro interno no servidor.');
  });

  // ── Logger called for server errors ──────────────────────────────────

  it('logs warn for mapped Prisma errors', () => {
    const host = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: '7.0.0',
      meta: {},
    });
    filter.catch(err, host);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('logs error for unmapped Prisma errors', () => {
    const host = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError('Unknown', {
      code: 'P9999',
      clientVersion: '7.0.0',
      meta: {},
    });
    filter.catch(err, host);
    expect(errorSpy).toHaveBeenCalled();
  });

  it('logs error for unhandled exceptions', () => {
    const host = makeHost();
    filter.catch(new Error('boom'), host);
    expect(errorSpy).toHaveBeenCalled();
  });
});
