import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../../../shared/infrastructure/guards/roles.decorator';
import { RolesGuard } from '../../../shared/infrastructure/guards/roles.guard';
import { PlaceOrderUseCase } from '../application/commands/place-order.use-case';
import { CancelOrderUseCase } from '../application/commands/cancel-order.use-case';
import { GetOrderUseCase } from '../application/queries/get-order.use-case';
import { PlaceOrderRequest } from './dto/place-order.request';
import { Order } from '../domain/order.entity';

interface OrderItemView {
  productId: string;
  quantity: number;
  unitPrice: number;
}

interface OrderView {
  id: string;
  userId: string;
  status: string;
  totalAmount: number;
  currency: string;
  items: OrderItemView[];
  createdAt: Date;
}

function toView(order: Order): OrderView {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    totalAmount: order.totalAmount,
    currency: order.currency,
    items: order.items.getItems().map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
    })),
    createdAt: order.createdAt,
  };
}

@Controller('orders')
export class OrderController {
  constructor(
    private readonly placeOrder: PlaceOrderUseCase,
    private readonly cancelOrder: CancelOrderUseCase,
    private readonly getOrder: GetOrderUseCase,
  ) {}

  @Post()
  async create(@Body() body: PlaceOrderRequest): Promise<OrderView> {
    const order = await this.placeOrder.execute(body);
    return toView(order);
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OrderView> {
    const order = await this.getOrder.execute(id);
    return toView(order);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('admin')
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<OrderView> {
    const order = await this.cancelOrder.execute(id);
    return toView(order);
  }
}
