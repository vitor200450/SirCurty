import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { GoogleAuthService } from './google-auth.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly googleAuthService: GoogleAuthService,
    private readonly prisma: PrismaService,
  ) {}

  async findOrCreateGoogleUser(idToken: string) {
    // Primeiro, valida o token recebido do Google.
    const identity = await this.googleAuthService.verifyIdToken(idToken);

    // Se o usuário já existe, reutiliza a conta.
    const existingUser = await this.prisma.user.findUnique({
      where: {
        googleSub: identity.googleSub,
      },
    });

    if (existingUser) {
      return existingUser;
    }

    // Se não existe, cria uma nova conta.
    try {
      return await this.prisma.user.create({
        data: {
          googleSub: identity.googleSub,
          email: identity.email,
          name: identity.name,
        },
      });
    } catch (error: unknown) {
      // Trata possíveis cadastros simultâneos e conflitos
      // nas restrições de unicidade do banco.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        // Outro pedido pode ter criado a conta nesse intervalo.
        const user = await this.prisma.user.findUnique({
          where: {
            googleSub: identity.googleSub,
          },
        });

        if (user) {
          return user;
        }

        // Não associamos contas automaticamente apenas pelo e-mail.
        throw new ConflictException(
          'An account with this email already exists',
        );
      }

      throw error;
    }
  }

  async transferAnonymousLinks(
    userId: number,
    anonId: string | undefined,
  ): Promise<number> {
    if (!anonId) {
      return 0;
    }

    const result = await this.prisma.link.updateMany({
      where: {
        ownerAnonId: anonId,
        ownerUserId: null,
      },
      data: {
        ownerUserId: userId,
        ownerAnonId: null,
      },
    });

    return result.count;
  }
}
