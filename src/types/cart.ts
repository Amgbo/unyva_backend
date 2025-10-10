// src/types/cart.ts
export type CartItem = {
  id: number;             // cart item id
  productId: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
};