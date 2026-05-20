import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CreateProductUseCase } from '../application/commands/create-product.use-case';
import { GetProductUseCase } from '../application/queries/get-product.use-case';
import { CreateProductRequest } from './dto/create-product.request';
import { Product } from '../domain/product.entity';

interface ProductView {
  id: string;
  name: string;
  price: number;
  currency: string;
  stock: number;
}

function toView(product: Product): ProductView {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    currency: product.currency,
    stock: product.stock,
  };
}

@Controller('products')
export class ProductController {
  constructor(
    private readonly createProduct: CreateProductUseCase,
    private readonly getProduct: GetProductUseCase,
  ) {}

  @Post()
  async create(@Body() body: CreateProductRequest): Promise<ProductView> {
    const product = await this.createProduct.execute(body);
    return toView(product);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProductView> {
    const product = await this.getProduct.execute(id);
    return toView(product);
  }
}
