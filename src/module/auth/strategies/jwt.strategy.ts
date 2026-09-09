import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Lấy token từ header "Authorization: Bearer xxx"
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  // Hàm này tự động chạy mỗi khi có request có token
  async validate(payload: { sub: string; email: string }) {
    // Kiểm tra User có thật sự tồn tại trong DB không
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Token không hợp lệ hoặc user đã bị xóa.',
      );
    }

    // Gán payload vào req.user để controller/guard dùng
    return {
      id: user.id,
      email: user.email,
    };
  }
}
