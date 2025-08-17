import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { registerAs } from '@nestjs/config';

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  allowedOrigins: string[];
  jwtSecret: string;
  jwtExpiresIn: string;
  bcryptRounds: number;
  maxFileSize: number;
  emailFrom: string;
  emailReplyTo: string;
}

@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get app(): AppConfig {
    return {
      nodeEnv: this.configService.get<string>('app.nodeEnv'),
      port: this.configService.get<number>('app.port'),
      apiPrefix: this.configService.get<string>('app.apiPrefix'),
      allowedOrigins: this.configService.get<string[]>('app.allowedOrigins'),
      jwtSecret: this.configService.get<string>('app.jwtSecret'),
      jwtExpiresIn: this.configService.get<string>('app.jwtExpiresIn'),
      bcryptRounds: this.configService.get<number>('app.bcryptRounds'),
      maxFileSize: this.configService.get<number>('app.maxFileSize'),
      emailFrom: this.configService.get<string>('app.emailFrom'),
      emailReplyTo: this.configService.get<string>('app.emailReplyTo'),
    };
  }
}

export default registerAs('app', (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
  emailFrom: process.env.EMAIL_FROM || 'noreply@coldmail-saas.com',
  emailReplyTo: process.env.EMAIL_REPLY_TO || 'support@coldmail-saas.com',
}));
