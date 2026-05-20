import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/mariadb';
import { Product } from '../../domain/product.entity';
import { ProductRepository } from '../../domain/product.repository';

@Injectable()
export class ProductMikroOrmRepository implements ProductRepository {
  constructor(private readonly em: EntityManager) {}

  async save(product: Product): Promise<void> {
    await this.em.persistAndFlush(product);
  }

  findById(id: string): Promise<Product | null> {
    return this.em.findOne(Product, { id });
  }

  findByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return Promise.resolve([]);
    return this.em.find(Product, { id: { $in: ids } });
  }
}
