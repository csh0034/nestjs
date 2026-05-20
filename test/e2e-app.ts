import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { MikroORM } from '@mikro-orm/core';
import { AppModule } from '../src/app.module';
import { LoggingInterceptor } from '../src/shared/infrastructure/interceptors/logging.interceptor';
import { DomainExceptionFilter } from '../src/shared/infrastructure/filters/domain-exception.filter';
import { RolesGuard } from '../src/shared/infrastructure/guards/roles.guard';

export async function createE2EApp(): Promise<{ app: INestApplication; orm: MikroORM }> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new LoggingInterceptor());
  app.useGlobalGuards(new RolesGuard(app.get(Reflector)));
  app.useGlobalFilters(new DomainExceptionFilter());

  await app.init();

  const orm = app.get(MikroORM);
  await orm.schema.refreshDatabase();

  return { app, orm };
}
