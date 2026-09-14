import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../../mail/mail.service.js';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/auth.dto.js';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email đã được sử dụng.');
      }

      const password = await bcrypt.hash(dto.password, 10);

      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          password,
          name: dto.name,
          isVerified: true,
        },
      });

      return this.generateTokens(user.id, user.tokenVersion);
    } catch (error) {
      console.error('❌ REGISTER ERROR:', error);
      throw error;
    }
  }
  async login(dto: LoginDto) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user || !user.password) {
        throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
      }

      const isMatch = await bcrypt.compare(dto.password, user.password);
      if (!isMatch) {
        throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
      }
      return this.generateTokens(user.id, user.tokenVersion);
    } catch (error) {
      console.error('❌ LOGIN ERROR:', error);
      throw error;
    }
  }
  async refreshTokens(refreshToken: string) {
    let payload: { sub: string; ver?: number };
    try {
      payload = await this.jwtService.verifyAsync<{
        sub: string;
        ver?: number;
      }>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token không hợp lệ hoặc đã hết hạn.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại.');
    }

    if ((payload.ver ?? 0) !== user.tokenVersion) {
      throw new UnauthorizedException(
        'Refresh token đã bị thu hồi, vui lòng đăng nhập lại.',
      );
    }

    return this.generateTokens(user.id, user.tokenVersion);
  }

  /** Bumps the user's token version so every refresh token issued before
   * this call (on any device/tab) is rejected on its next use. */
  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async getProfile(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        throw new UnauthorizedException('Người dùng không tồn tại.');
      }

      return user;
    } catch (error) {
      console.error('❌ GET PROFILE ERROR:', error);
      throw error;
    }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
      select: { id: true, email: true, name: true },
    });
  }

  /** Re-issues a fresh token pair on the new version so the caller's current
   * session keeps working while every *other* session is signed out. */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.password) {
      throw new UnauthorizedException('Người dùng không tồn tại.');
    }

    const isMatch = await bcrypt.compare(dto.currentPassword, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác.');
    }

    const password = await bcrypt.hash(dto.newPassword, 10);
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { password, tokenVersion: { increment: 1 } },
    });

    return this.generateTokens(updated.id, updated.tokenVersion);
  }

  /** Always resolves with the same generic message regardless of whether the
   * email exists, so this endpoint can't be used to enumerate accounts. */
  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (user) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(rawToken)
        .digest('hex');

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          resetPasswordToken: hashedToken,
          resetPasswordExpires: new Date(Date.now() + RESET_TOKEN_TTL_MS),
        },
      });

      const frontendUrl =
        this.configService.get<string>('FRONTEND_URL') ??
        'http://localhost:4000';
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

      await this.mailService.sendPasswordResetEmail(user.email, resetUrl);
    }

    return {
      message:
        'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(dto.token)
      .digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.',
      );
    }

    const password = await bcrypt.hash(dto.password, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        tokenVersion: { increment: 1 },
      },
    });

    return { message: 'Đặt lại mật khẩu thành công.' };
  }

  private async generateTokens(id: string, tokenVersion: number) {
    const payload = {
      sub: id,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = await this.jwtService.signAsync(
      { ...payload, ver: tokenVersion },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }
}
