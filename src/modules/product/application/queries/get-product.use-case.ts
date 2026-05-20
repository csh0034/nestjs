import { Inject, Injectable } from '@nestjs/common';
import { UseCase } from '../../../../shared/application/use-case';
import { NotFoundDomainException } from '../../../../shared/domain/domain-exception';
import { Product } from '../../domain/product.entity';
import { PRODUCT_REPOSITORY, ProductRepository } from '../../domain/product.repository';

@Injectable()
export class GetProductUseCase implements UseCase<string, Product> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly products: ProductRepository,
  ) {}

  async execute(id: string): Promise<Product> {
    const product = await this.products.findById(id);
    if (!product) {
      throw new NotFoundDomainException(`product not found: ${id}`);
    }
    return product;
  }
}
