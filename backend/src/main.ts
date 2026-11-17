import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true, credentials: true });
  app.use((req: any, res: any, next: any) => {
    if (req.url.startsWith('/auth')) {
      console.log(`[HTTP REQ] ${req.method} ${req.url}`, {
        contentType: req.headers['content-type'],
        body: req.body,
      });
    }
    next();
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  await app.listen(3001);
}
bootstrap();