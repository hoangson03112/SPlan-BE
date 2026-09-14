import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const email = `e2e-${Date.now()}@example.com`;
  const password = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('registers a new user and sets auth cookies', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email, password })
      .expect(201);

    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('rejects login with the wrong password', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password: 'wrong-password' })
      .expect(401);
  });

  it('logs in and refreshes tokens using the refresh cookie', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    expect(cookies.some((c) => c.startsWith('refresh_token='))).toBe(true);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookies)
      .expect(201);
  });

  it('rejects an old refresh token after logout', async () => {
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);
    const cookiesBeforeLogout = loginRes.headers[
      'set-cookie'
    ] as unknown as string[];

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Cookie', cookiesBeforeLogout)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', cookiesBeforeLogout)
      .expect(401);
  });

  it('rejects protected routes without a valid access token', async () => {
    await request(app.getHttpServer()).get('/auth/profile').expect(401);
  });

  it('forgot-password always returns a generic message', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/forgot-password')
      .send({ email: 'no-such-user@example.com' })
      .expect(201);

    expect(res.body.data.message).toMatch(/Nếu email tồn tại/);
  });
});
