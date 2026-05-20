export interface CreateProductCommand {
  name: string;
  price: number;
  currency?: string;
  stock: number;
}
