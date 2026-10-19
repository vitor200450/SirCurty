import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { GoogleAuthService } from './google-auth.service.js';
import { SessionService } from './session.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, GoogleAuthService, SessionService],
  exports: [AuthService, GoogleAuthService, SessionService],
})
export class AuthModule {}
