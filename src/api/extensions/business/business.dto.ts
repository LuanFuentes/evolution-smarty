export class OrderDetailsDto {
  orderId: string;
  tokenBase64: string;
}

export class CatalogoDto {
  /** El número cuyo catálogo se lee; sin él, el de la línea. */
  number?: string;
  limit?: number;
}

export class ProductosABorrarDto {
  productIds: string[];
}
