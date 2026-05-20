import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case';
import { Money } from '../../../../shared/domain/money.vo';
import { Product } from '../../domain/product.entity';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../domain/product.repository';
import { CreateProductCommand } from '../dto/create-product.command';

@Injectable()
export class CreateProductUseCase implements UseCase<CreateProductCommand, Product> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async execute(input: CreateProductCommand): Promise<Product> {
    const price = Money.of(input.price, input.currency);
    const product = Product.create({ name: input.name, price, stock: input.stock });
    await this.products.save(product);
    return product;
  }
}
