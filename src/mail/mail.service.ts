import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: nodemailer.Transporter | null;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port: this.configService.get<number>('MAIL_PORT') ?? 587,
          secure: false,
          auth: this.configService.get<string>('MAIL_USER')
            ? {
                user: this.configService.get<string>('MAIL_USER'),
                pass: this.configService.get<string>('MAIL_PASS'),
              }
            : undefined,
        })
      : null;
  }

  async sendPasswordResetEmail(to: string, resetUrl: string) {
    const from =
      this.configService.get<string>('MAIL_FROM') ??
      'SPlan <no-reply@splan.local>';

    if (!this.transporter) {
      this.logger.warn(
        `MAIL_HOST chưa được cấu hình — in link đặt lại mật khẩu ra log thay vì gửi email: ${resetUrl}`,
      );
      return;
    }

    await this.transporter.sendMail({
      from,
      to,
      subject: 'Đặt lại mật khẩu SPlan',
      html: `<p>Bạn (hoặc ai đó) đã yêu cầu đặt lại mật khẩu cho tài khoản SPlan.</p>
        <p>Nhấn vào liên kết bên dưới để đặt mật khẩu mới (hết hạn sau 30 phút):</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Nếu bạn không yêu cầu điều này, hãy bỏ qua email này.</p>`,
    });
  }
}
