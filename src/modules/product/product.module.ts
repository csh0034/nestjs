import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Product } from './domain/product.entity';
import { PRODUCT_REPOSITORY } from './domain/product.repository';
import { ProductMikroOrmRepository } from './infrastructure/persistence/product.mikro-orm.repository';
import { CreateProductUseCase } from './application/commands/create-product.use-case';
import { GetProductUseCase } from './application/queries/get-product.use-case';
import { ProductController } from './presentation/product.controller';

@Module({
  imports: [MikroOrmModule.forFeature([Product])],
  controllers: [ProductController],
  providers: [
    CreateProductUseCase,
    GetProductUseCase,
    {
      provide: PRODUCT_REPOSITORY,
      useClass: ProductMikroOrmRepository,
    },
  ],
  exports: [PRODUCT_REPOSITORY, GetProductUseCase],
})
export class ProductModule {}
