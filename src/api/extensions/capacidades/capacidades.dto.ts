/** Un medio: por URL o en base64 (con su mimetype). */
export class MedioDto {
  url?: string;
  base64?: string;
  mimetype?: string;
  caption?: string;
}

/** POST /message/sendAlbum/{instance} · varias fotos/videos en UNA burbuja. */
export class SendAlbumDto {
  number?: string;
  jid?: string;
  items: MedioDto[];
  /** Milisegundos entre cada foto (WhatsApp arma el álbum a medida que llegan). */
  delay?: number;
}

/** POST /chat/quickReply/{instance} · crea o edita una respuesta rápida del WhatsApp Business del teléfono. */
export class QuickReplyDto {
  /** El atajo, sin la barra: «gracias» aparece como /gracias. */
  shortcut: string;
  message: string;
  keywords?: string[];
  /** El id de la respuesta (su timestamp); se manda para editar, se omite para crear. */
  timestamp?: string;
}

/** POST /chat/removeQuickReply/{instance} */
export class RemoveQuickReplyDto {
  timestamp: string;
}

/** POST /business/productCreate/{instance} */
export class ProductCreateDto {
  name: string;
  description: string;
  price: number;
  currency: string;
  retailerId?: string;
  url?: string;
  isHidden?: boolean;
  originCountryCode?: string;
  images: MedioDto[];
}

/** POST /business/productUpdate/{instance} */
export class ProductUpdateDto extends ProductCreateDto {
  productId: string;
}

/** POST /business/productDelete/{instance} */
export class ProductDeleteDto {
  productIds: string[];
}
