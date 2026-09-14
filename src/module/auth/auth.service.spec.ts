import { jest } from '@jest/globals';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';

const KNOWN_PASSWORD = 'password123';
const KNOWN_PASSWORD_HASH = bcrypt.hashSync(KNOWN_PASSWORD, 10);

type MockUser = {
  id: string;
  email: string;
  password: string | null;
  tokenVersion: number;
  resetPasswordToken: string | null;
  resetPasswordExpires: Date | null;
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let configService: { get: jest.Mock };
  let mailService: { sendPasswordResetEmail: jest.Mock };

  const baseUser: MockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: KNOWN_PASSWORD_HASH,
    tokenVersion: 0,
    resetPasswordToken: null,
    resetPasswordExpires: null,
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    jwtService = { signAsync: jest.fn(), verifyAsync: jest.fn() };
    configService = { get: jest.fn(() => 'secret') };
    mailService = { sendPasswordResetEmail: jest.fn() };

    service = new AuthService(
      prisma as any,
      jwtService as any,
      configService as any,
      mailService as any,
    );

    jwtService.signAsync.mockImplementation(
      async (payload: Record<string, unknown>) => JSON.stringify(payload),
    );
  });

  describe('register', () => {
    it('rejects a duplicate email', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      await expect(
        service.register({
          email: baseUser.email,
          password: 'password123',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates the user and returns a token pair', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue(baseUser);

      const tokens = await service.register({
        email: baseUser.email,
        password: 'password123',
      });

      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(JSON.parse(tokens.refreshToken)).toMatchObject({
        sub: baseUser.id,
        ver: 0,
      });
    });
  });

  describe('login', () => {
    it('rejects when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nope@example.com', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an incorrect password', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      await expect(
        service.login({ email: baseUser.email, password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('rejects a refresh token whose version is stale (post-logout)', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: baseUser.id, ver: 0 });
      prisma.user.findUnique.mockResolvedValue({
        ...baseUser,
        tokenVersion: 1,
      });

      await expect(service.refreshTokens('stale-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('issues new tokens when the version matches', async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: baseUser.id, ver: 0 });
      prisma.user.findUnique.mockResolvedValue(baseUser);

      const tokens = await service.refreshTokens('valid-token');
      expect(tokens.accessToken).toBeDefined();
    });
  });

  describe('logout', () => {
    it('bumps the token version so old refresh tokens stop working', async () => {
      prisma.user.update.mockResolvedValue({
        ...baseUser,
        tokenVersion: 1,
      });

      await service.logout(baseUser.id);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: baseUser.id },
        data: { tokenVersion: { increment: 1 } },
      });
    });
  });

  describe('forgotPassword', () => {
    it('returns a generic message even when the email is unknown', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword({
        email: 'unknown@example.com',
      });

      expect(result.message).toMatch(/Nếu email tồn tại/);
      expect(mailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('stores a hashed token and emails a reset link for a real user', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      prisma.user.update.mockResolvedValue(baseUser);

      await service.forgotPassword({ email: baseUser.email });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: baseUser.id },
          data: expect.objectContaining({
            resetPasswordToken: expect.any(String),
            resetPasswordExpires: expect.any(Date),
          }),
        }),
      );
      expect(mailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        baseUser.email,
        expect.stringContaining('/reset-password?token='),
      );
    });
  });

  describe('resetPassword', () => {
    it('rejects an unknown or expired token', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.resetPassword({ token: 'bad-token', password: 'newpass123' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('sets a new password and invalidates existing sessions', async () => {
      prisma.user.findFirst.mockResolvedValue(baseUser);
      prisma.user.update.mockResolvedValue(baseUser);

      await service.resetPassword({
        token: 'good-token',
        password: 'newpass123',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: baseUser.id },
          data: expect.objectContaining({
            resetPasswordToken: null,
            resetPasswordExpires: null,
            tokenVersion: { increment: 1 },
          }),
        }),
      );
    });
  });

  describe('changePassword', () => {
    it('rejects an incorrect current password', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      await expect(
        service.changePassword(baseUser.id, {
          currentPassword: 'wrong-password',
          newPassword: 'newpass123',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('bumps the token version and returns a fresh token pair', async () => {
      prisma.user.findUnique.mockResolvedValue(baseUser);
      prisma.user.update.mockResolvedValue({
        ...baseUser,
        tokenVersion: baseUser.tokenVersion + 1,
      });

      const tokens = await service.changePassword(baseUser.id, {
        currentPassword: 'password123',
        newPassword: 'newpass123',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: baseUser.id },
          data: expect.objectContaining({
            tokenVersion: { increment: 1 },
          }),
        }),
      );
      expect(tokens.accessToken).toBeDefined();
    });
  });
});
