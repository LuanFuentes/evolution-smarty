/**
 * Lo puro de las capacidades, sin importar Baileys ni el monitor: para probarlo con node --test.
 */
import type { WAMediaUpload, WASendableProduct } from 'baileys';

import { MedioDto, ProductoEnviableDto } from './capacidades.dto';

/** Un medio del DTO a lo que Baileys sube: URL tal cual o el base64 como Buffer. */
export function comoMedio(m: MedioDto): WAMediaUpload {
  if (m.base64) return Buffer.from(m.base64.replace(/^data:[^;]+;base64,/, ''), 'base64');
  return { url: m.url as string };
}

/** Video si el mimetype o la extensión lo dicen; si no, imagen. */
export function esVideo(m: MedioDto): boolean {
  if (m.mimetype) return m.mimetype.startsWith('video/');
  return /\.(mp4|mov|webm|3gp|mkv)(\?|$)/i.test(m.url ?? '');
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** El producto del DTO a lo que Baileys arma como `productMessage`: el precio pasa a milésimas y la foto se sube. */
export function comoProductoEnviable(p: ProductoEnviableDto): WASendableProduct {
  return {
    productId: p.productId,
    title: p.title,
    description: p.description ?? '',
    currencyCode: p.currencyCode,
    priceAmount1000: Math.round(p.price * 1000),
    retailerId: p.retailerId,
    url: p.url,
    productImageCount: 1,
    productImage: comoMedio(p.image),
  };
}

/** El dueño del catálogo: el que pidan o la propia línea, siempre sin el sufijo del dispositivo (`:12`). */
export function elDuenoDelCatalogo(pedido: string | undefined, propio: string | undefined): string {
  const jid = pedido || propio;
  if (!jid) throw new Error('No hay JID del dueño del catálogo (la línea no informó su usuario)');
  return jid.replace(/:\d+@/, '@').replace(/@c\.us$/, '@s.whatsapp.net');
}
