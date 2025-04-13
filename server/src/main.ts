import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'debug', 'log', 'verbose'],
  });

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: [
      'https://soulart.ge',
      'https://www.soulart.ge',
      'http://localhost:3000',
      'https://localhost:3000',  // Added HTTPS local frontend
      'http://localhost:4000',   // Added HTTP local backend
      'https://localhost:4000',  // Added HTTPS local backend
      /localhost/               // Fallback pattern for any localhost
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'forum-id', 'Origin', 'Accept']
  });

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.use('/favicon.ico', (req, res) => res.status(204).send());

  const config = new DocumentBuilder()
    .setTitle('SoulArt  API')
    .setDescription('SoulArt E-commerce REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document); // დარწმუნდით, რომ როუტი არის '/docs'

  app.enableShutdownHooks();

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0'); // ვერსელისთვის საჭიროა '0.0.0.0'

  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
