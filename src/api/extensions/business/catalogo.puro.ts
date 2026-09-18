/**
 * El catálogo de la línea (los productos del WhatsApp Business del teléfono), leído del nodo entero.
 *
 * 🚨 UN TIMEOUT NO ES UN CATÁLOGO VACÍO (18-sep-2026). WhatsApp dejó de contestar la familia `w:biz:catalog`
 * por QR (leer catálogo y colecciones, crear/editar/borrar productos): Baileys #2717, abierto desde julio.
 * Y Baileys 7 rc14 atrapa el «Timed Out» en `waitForMessage` y devuelve `undefined`; `parseCatalogNode(undefined)`
 * da `{ products: [] }`. Así, `getCatalog` de upstream responde «0 productos» a los 60 s exactos para TODAS las
 * líneas, y quien lo lee concluye «el teléfono no tiene catálogo». Acá el IQ se manda por `client.query` y un
 * resultado `undefined` es lo que es: WhatsApp no contestó (504), no «vacío».
 *
 * Puro: sin importar Baileys, para probarlo con node --test. La forma del nodo es la de Baileys `getCatalog`.
 */
import type { NodoBinario } from './pedido.puro';

export interface ProductoDelCatalogo {
  id: string | null;
  retailerId: string | null;
  name: string | null;
  description: string | null;
  price: number;
  currency: string | null;
  url: string | null;
  imageUrl: string | null;
  isHidden: boolean;
  reviewStatus: string | null;
}

export interface PaginaDelCatalogo {
  products: ProductoDelCatalogo[];
  nextPageCursor: string | null;
}

const hijos = (nodo: NodoBinario | undefined, tag: string): NodoBinario[] =>
  Array.isArray(nodo?.content) ? nodo.content.filter((h) => h.tag === tag) : [];

const hijo = (nodo: NodoBinario | undefined, tag: string): NodoBinario | undefined => hijos(nodo, tag)[0];

const texto = (nodo: NodoBinario | undefined, tag: string): string | null => {
  const contenido = hijo(nodo, tag)?.content;
  if (contenido instanceof Uint8Array) return Buffer.from(contenido).toString('utf-8');
  if (typeof contenido === 'string') return contenido;
  return null;
};

/** El mismo IQ que manda Baileys en `getCatalog` (w:biz:catalog · product_catalog), armado acá para poder ver el timeout. */
export function elIqDelCatalogo(jid: string, limit: number, cursor?: string | null): NodoBinario {
  const params: NodoBinario[] = [
    { tag: 'limit', attrs: {}, content: Buffer.from(String(limit)) },
    { tag: 'width', attrs: {}, content: Buffer.from('100') },
    { tag: 'height', attrs: {}, content: Buffer.from('100') },
  ];
  if (cursor) params.push({ tag: 'after', attrs: {}, content: Buffer.from(cursor) });
  return {
    tag: 'iq',
    attrs: { to: 's.whatsapp.net', type: 'get', xmlns: 'w:biz:catalog' },
    content: [{ tag: 'product_catalog', attrs: { jid, allow_shop_source: 'true' }, content: params }],
  };
}

/** La respuesta al IQ del catálogo → los productos de esa página y el cursor de la siguiente. */
export function elCatalogoDelNodo(respuesta: NodoBinario): PaginaDelCatalogo {
  const catalogo = hijo(respuesta, 'product_catalog');
  const products = hijos(catalogo, 'product').map((p) => {
    const media = hijo(p, 'media');
    const imagen = hijo(media, 'image');
    const precio = Number(texto(p, 'price'));
    return {
      id: texto(p, 'id'),
      retailerId: texto(p, 'retailer_id'),
      name: texto(p, 'name'),
      description: texto(p, 'description'),
      price: Number.isFinite(precio) ? precio : 0,
      currency: texto(p, 'currency'),
      url: texto(p, 'url'),
      imageUrl: texto(imagen, 'original_image_url') ?? texto(imagen, 'request_image_url'),
      isHidden: p.attrs?.is_hidden === 'true',
      reviewStatus: texto(hijo(p, 'status_info'), 'status'),
    };
  });
  const paging = hijo(catalogo, 'paging');
  return { products, nextPageCursor: texto(paging, 'after') };
}

/** El jid propio sin el sufijo de dispositivo (`51999…:12@s.whatsapp.net` → `51999…@s.whatsapp.net`). */
export function elJidSinDispositivo(jid: string): string {
  const [usuario, servidor] = jid.split('@');
  return `${(usuario ?? '').split(':')[0]}@${servidor ?? 's.whatsapp.net'}`;
}

/** El IQ de Baileys `productDelete` (w:biz:catalog · product_catalog_delete), armado acá por la misma razón. */
export function elIqDeBorrarProductos(productIds: string[]): NodoBinario {
  return {
    tag: 'iq',
    attrs: { to: 's.whatsapp.net', type: 'set', xmlns: 'w:biz:catalog' },
    content: [
      {
        tag: 'product_catalog_delete',
        attrs: { v: '1' },
        content: productIds.map((id) => ({
          tag: 'product',
          attrs: {},
          content: [{ tag: 'id', attrs: {}, content: Buffer.from(id) }],
        })),
      },
    ],
  };
}

/** Cuántos borró WhatsApp según la respuesta. */
export function losBorradosDelNodo(respuesta: NodoBinario): number {
  const n = Number(hijo(respuesta, 'product_catalog_delete')?.attrs?.deleted_count);
  return Number.isFinite(n) ? n : 0;
}
