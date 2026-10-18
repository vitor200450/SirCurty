import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller.js';

// ── Mock factory ────────────────────────────────────────────────────────────

function makePrisma(
  queryRawImpl: () => Promise<unknown> = () =>
    Promise.resolve([{ '?column?': 1 }]),
) {
  return {
    $queryRaw: jest.fn(queryRawImpl),
  };
}

function makeController(prismaOverrides?: ReturnType<typeof makePrisma>) {
  const prisma = prismaOverrides ?? makePrisma();
  const controller = new HealthController(prisma as never);
  return { controller, prisma };
}

// ── /health/live ─────────────────────────────────────────────────────────────

describe('HealthController.live', () => {
  it('returns { status: "ok" } without querying the database', () => {
    const { controller, prisma } = makeController();

    const result = controller.live();

    expect(result).toEqual({ status: 'ok' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});

// ── /health/ready ─────────────────────────────────────────────────────────────

describe('HealthController.ready', () => {
  it('returns { status: "ok", db: "ok" } when the database is reachable', async () => {
    const { controller } = makeController();

    const result = await controller.ready();

    expect(result).toEqual({ status: 'ok', db: 'ok' });
  });

  it('issues a SELECT 1 to verify the database connection', async () => {
    const { controller, prisma } = makeController();

    await controller.ready();

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('throws ServiceUnavailableException when the database is unreachable', async () => {
    const failingPrisma = makePrisma(() =>
      Promise.reject(new Error('connection refused')),
    );
    const { controller } = makeController(failingPrisma);

    await expect(controller.ready()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('does not expose the internal error message in the exception', async () => {
    const failingPrisma = makePrisma(() =>
      Promise.reject(new Error('ECONNREFUSED 10.0.0.5:5432')),
    );
    const { controller } = makeController(failingPrisma);

    let caught: unknown;
    try {
      await controller.ready();
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ServiceUnavailableException);
    const body = (caught as ServiceUnavailableException).getResponse();
    expect(JSON.stringify(body)).not.toContain('ECONNREFUSED');
    expect(JSON.stringify(body)).not.toContain('10.0.0.5');
  });
});
