/**
 * El pedido nativo (el carrito que el cliente manda desde el catálogo), leído del nodo completo.
 *
 * Baileys `parseOrderDetailsNode` devuelve id, nombre, foto, precio, moneda y cantidad, y se come todo lo
 * demás del nodo (`retailer_id` si viene). Acá se lee el mismo nodo sin perder nada: cada producto trae
 * `retailerId` (null si WhatsApp no lo manda) y `campos` (las etiquetas hijas que llegaron), para medirlo
 * una vez con un pedido real y saber si el mapa catálogo ↔ productos es la fuente o el respaldo.
 *
 * Puro: sin importar Baileys, para probarlo con node --test.
 */

/** La forma mínima de un nodo binario de WhatsApp (la de Baileys, sin importarla). */
export interface NodoBinario {
  tag: string;
  attrs?: Record<string, string>;
  content?: NodoBinario[] | string | Uint8Array;
}

export interface ProductoDelPedido {
  id: string | null;
  retailerId: string | null;
  name: string | null;
  imageUrl: string | null;
  price: number;
  currency: string | null;
  quantity: number;
  /** Las etiquetas hijas del nodo del producto tal como llegaron (para medir qué manda WhatsApp). */
  campos: string[];
}

export interface PedidoNativo {
  price: { total: number; currency: string | null };
  products: ProductoDelPedido[];
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

const numero = (nodo: NodoBinario | undefined, tag: string): number => {
  const n = Number(texto(nodo, tag));
  return Number.isFinite(n) ? n : 0;
};

/** El nodo `<order>` de la respuesta al IQ `fb:thrift_iq` → el pedido con sus productos completos. */
export function elPedidoDelNodo(respuesta: NodoBinario): PedidoNativo {
  const order = hijo(respuesta, 'order');
  const products = hijos(order, 'product').map((p) => ({
    id: texto(p, 'id'),
    retailerId: texto(p, 'retailer_id'),
    name: texto(p, 'name'),
    imageUrl: texto(hijo(p, 'image'), 'url'),
    price: numero(p, 'price'),
    currency: texto(p, 'currency'),
    quantity: numero(p, 'quantity'),
    campos: Array.isArray(p.content) ? p.content.map((h) => h.tag) : [],
  }));
  const price = hijo(order, 'price');
  return { price: { total: numero(price, 'total'), currency: texto(price, 'currency') }, products };
}

/** El mismo IQ que manda Baileys en `getOrderDetails` (fb:thrift_iq · order op=get), armado acá para leer el nodo entero. */
export function elIqDelPedido(orderId: string, tokenBase64: string): NodoBinario {
  return {
    tag: 'iq',
    attrs: { to: 's.whatsapp.net', type: 'get', xmlns: 'fb:thrift_iq', smax_id: '5' },
    content: [
      {
        tag: 'order',
        attrs: { op: 'get', id: orderId },
        content: [
          {
            tag: 'image_dimensions',
            attrs: {},
            content: [
              { tag: 'width', attrs: {}, content: Buffer.from('100') },
              { tag: 'height', attrs: {}, content: Buffer.from('100') },
            ],
          },
          { tag: 'token', attrs: {}, content: Buffer.from(tokenBase64) },
        ],
      },
    ],
  };
}
