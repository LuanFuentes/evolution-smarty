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

/** El producto tal como va en la ficha nativa (Baileys `WASendableProduct`, sin la foto subida). */
export class ProductoEnviableDto {
  /** El id del producto en el catálogo de WhatsApp (el que devuelve getCatalog / productCreate). */
  productId: string;
  title: string;
  description?: string;
  /** ISO 4217: PEN, USD… */
  currencyCode: string;
  /** En unidades de la moneda (17.5); WhatsApp lo lleva en milésimas. */
  price: number;
  retailerId?: string;
  url?: string;
  image: MedioDto;
}

/** POST /message/sendProduct/{instance} · la ficha nativa de UN producto del catálogo (foto, precio y «Ver»). */
export class SendProductDto {
  number?: string;
  jid?: string;
  product: ProductoEnviableDto;
  /** El JID del negocio dueño del catálogo; por defecto, la propia línea. */
  businessOwnerJid?: string;
  body?: string;
  footer?: string;
}

/** POST /chat/quickReply/{instance} · crea o edita una respuesta rápida del WhatsApp Business del teléfono. */
/** Un día del horario del perfil de WhatsApp Business (Baileys `updateBussinesProfile`). */
export class DiaDelHorarioDto {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  mode: 'open_24h' | 'appointment_only' | 'specific_hours';
  /** Minutos desde la medianoche; sólo con `specific_hours`. */
  openTimeInMinutes?: number;
  closeTimeInMinutes?: number;
}

/** R0b · Lo que Smarty empuja al perfil de WhatsApp Business de la línea: dirección, descripción, email, sitios (el Maps va acá) y horario. */
export class BusinessProfileDto {
  address?: string;
  description?: string;
  email?: string;
  websites?: string[];
  hours?: { timezone: string; days: DiaDelHorarioDto[] };
}

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
