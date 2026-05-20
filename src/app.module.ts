import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { defineConfig } from '@mikro-orm/mariadb';
import { Migrator } from '@mikro-orm/migrations';
import { UserModule } from './modules/user/user.module';
import { ProductModule } from './modules/product/product.module';
import { OrderModule } from './modules/order/order.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [process.env.NODE_ENV === 'test' ? '.env.test' : '.env'],
    }),
    EventEmitterModule.forRoot(),
    MikroOrmModule.forRootAsync({
      useFactory: () =>
        defineConfig({
          host: process.env.DB_HOST ?? '127.0.0.1',
          port: Number(process.env.DB_PORT ?? 3306),
          user: process.env.DB_USER ?? 'root',
          password: process.env.DB_PASS ?? '',
          dbName: process.env.DB_NAME ?? 'nestjs_toy',
          entities: ['./dist/**/*.entity.js'],
          entitiesTs: ['./src/**/*.entity.ts'],
          debug: process.env.NODE_ENV !== 'production',
          allowGlobalContext: false,
          extensions: [Migrator],
        }),
    }),
    UserModule,
    ProductModule,
    OrderModule,
  ],
})
export class AppModule {}
