export interface PlaceOrderItem {
  productId: string;
  quantity: number;
}

export interface PlaceOrderCommand {
  userId: string;
  items: PlaceOrderItem[];
}
