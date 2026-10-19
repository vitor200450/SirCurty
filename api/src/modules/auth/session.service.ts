import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async create(userId: number): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    await this.prisma.session.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  /**
   * Resolves the user behind a session token.
   *
   * Returns null when the token is malformed, unknown or expired — the caller
   * decides whether that is a hard failure or a fallback to another identity.
   * Throwing here would make an expired cookie break every route that
   * resolves ownership, including the ones that work fine anonymously.
   */
  async validate(token: string) {
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return null;
    }

    const tokenHash = this.hashToken(token);

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session) {
      return null;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({
        where: { id: session.id },
      });

      return null;
    }

    return session.user;
  }

  async revoke(token: string): Promise<void> {
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return;
    }

    await this.prisma.session.deleteMany({
      where: {
        tokenHash: this.hashToken(token),
      },
    });
  }
}
