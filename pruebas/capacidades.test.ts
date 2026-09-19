// Correr: npm run test:fork
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { elIqDelPedido, elPedidoDelNodo, NodoBinario } from '@api/extensions/business/pedido.puro';
import {
  comoMedio,
  comoProductoEnviable,
  elDuenoDelCatalogo,
  esVideo,
} from '@api/extensions/capacidades/capacidades.puro';

test('un medio por URL va tal cual; en base64 se vuelve Buffer (con o sin el prefijo data:)', () => {
  assert.deepEqual(comoMedio({ url: 'https://x/y.jpg' }), { url: 'https://x/y.jpg' });
  const b = comoMedio({ base64: 'data:image/png;base64,aGVsbG8=' });
  assert.ok(Buffer.isBuffer(b));
  assert.equal((b as Buffer).toString(), 'hello');
  assert.equal((comoMedio({ base64: 'aGVsbG8=' }) as Buffer).toString(), 'hello');
});

test('video por mimetype o por extensión; si no, imagen', () => {
  assert.equal(esVideo({ url: 'https://x/clip.mp4' }), true);
  assert.equal(esVideo({ url: 'https://x/clip.mp4?token=1' }), true);
  assert.equal(esVideo({ url: 'https://x/foto.jpg' }), false);
  assert.equal(esVideo({ url: 'https://x/foto.jpg', mimetype: 'video/mp4' }), true);
  assert.equal(esVideo({ base64: 'aGVsbG8=' }), false);
});

test('el producto enviable lleva el precio en milésimas y la foto como medio', () => {
  const p = comoProductoEnviable({
    productId: '123',
    title: 'Frappé de fresa',
    currencyCode: 'PEN',
    price: 17.5,
    retailerId: 'prod-uuid',
    image: { url: 'https://x/fresa.jpg' },
  });
  assert.equal(p.priceAmount1000, 17500);
  assert.equal(p.description, '');
  assert.equal(p.productImageCount, 1);
  assert.deepEqual(p.productImage, { url: 'https://x/fresa.jpg' });
  assert.equal(p.retailerId, 'prod-uuid');
});

test('el dueño del catálogo: el pedido o la propia línea, sin el sufijo del dispositivo', () => {
  assert.equal(elDuenoDelCatalogo(undefined, '51999888777:12@s.whatsapp.net'), '51999888777@s.whatsapp.net');
  assert.equal(elDuenoDelCatalogo('51999000111@c.us', '51999888777:12@s.whatsapp.net'), '51999000111@s.whatsapp.net');
  assert.throws(() => elDuenoDelCatalogo(undefined, undefined));
});

const nodo = (tag: string, content?: NodoBinario['content'], attrs = {}): NodoBinario => ({ tag, attrs, content });
const cifra = (tag: string, v: string) => nodo(tag, Buffer.from(v));

test('el pedido del nodo entero: cada producto trae retailer_id si llegó y las etiquetas que vinieron', () => {
  const respuesta = nodo('iq', [
    nodo('order', [
      nodo('product', [
        cifra('id', '777'),
        cifra('name', 'Waffle'),
        nodo('image', [cifra('url', 'https://x/w.jpg')]),
        cifra('price', '20000'),
        cifra('currency', 'PEN'),
        cifra('quantity', '2'),
        cifra('retailer_id', 'uuid-w'),
      ]),
      nodo('product', [cifra('id', '778'), cifra('name', 'Té'), cifra('price', '14000'), cifra('quantity', '1')]),
      nodo('price', [cifra('total', '54000'), cifra('currency', 'PEN')]),
    ]),
  ]);
  const pedido = elPedidoDelNodo(respuesta);
  assert.deepEqual(pedido.price, { total: 54000, currency: 'PEN' });
  assert.equal(pedido.products.length, 2);
  assert.deepEqual(pedido.products[0], {
    id: '777',
    retailerId: 'uuid-w',
    name: 'Waffle',
    imageUrl: 'https://x/w.jpg',
    price: 20000,
    currency: 'PEN',
    quantity: 2,
    campos: ['id', 'name', 'image', 'price', 'currency', 'quantity', 'retailer_id'],
  });
  assert.equal(pedido.products[1].retailerId, null);
  assert.equal(pedido.products[1].imageUrl, null);
  assert.equal(pedido.products[1].currency, null);
});

test('sin nodo order no hay productos ni total', () => {
  assert.deepEqual(elPedidoDelNodo(nodo('iq', [])), { price: { total: 0, currency: null }, products: [] });
});

test('el IQ del pedido es el de Baileys: fb:thrift_iq, order op=get con el id, y el token', () => {
  const iq = elIqDelPedido('ORD1', 'dG9rZW4=');
  assert.equal(iq.attrs?.xmlns, 'fb:thrift_iq');
  const order = (iq.content as NodoBinario[])[0];
  assert.deepEqual(order.attrs, { op: 'get', id: 'ORD1' });
  const token = (order.content as NodoBinario[]).find((h) => h.tag === 'token');
  assert.equal(Buffer.from(token?.content as Uint8Array).toString(), 'dG9rZW4=');
});

// ─── El catálogo por QR: un timeout no es un catálogo vacío (18-sep) ───
import {
  elCatalogoDelNodo,
  elIqDeBorrarProductos,
  elIqDelCatalogo,
  elJidSinDispositivo,
  losBorradosDelNodo,
} from '@api/extensions/business/catalogo.puro';

const b = (s: string) => Buffer.from(s);

test('elIqDelCatalogo arma el mismo IQ que Baileys getCatalog (w:biz:catalog · product_catalog · limit/width/height, after si hay cursor)', () => {
  const iq = elIqDelCatalogo('51999@s.whatsapp.net', 100);
  assert.equal(iq.attrs?.xmlns, 'w:biz:catalog');
  assert.equal(iq.attrs?.type, 'get');
  const pc = (iq.content as NodoBinario[])[0];
  assert.equal(pc.tag, 'product_catalog');
  assert.deepEqual(pc.attrs, { jid: '51999@s.whatsapp.net', allow_shop_source: 'true' });
  assert.deepEqual((pc.content as NodoBinario[]).map((n) => n.tag), ['limit', 'width', 'height']);
  assert.equal((pc.content as NodoBinario[])[0].content?.toString(), '100');
  const conCursor = elIqDelCatalogo('x@s.whatsapp.net', 10, 'abc');
  const tags = ((conCursor.content as NodoBinario[])[0].content as NodoBinario[]).map((n) => n.tag);
  assert.deepEqual(tags, ['limit', 'width', 'height', 'after']);
});

test('elCatalogoDelNodo lee cada producto entero (id, retailer_id, precio, imagen original, oculto, estado) y el cursor', () => {
  const nodo: NodoBinario = {
    tag: 'iq',
    attrs: { type: 'result' },
    content: [
      {
        tag: 'product_catalog',
        attrs: {},
        content: [
          {
            tag: 'product',
            attrs: { is_hidden: 'false' },
            content: [
              { tag: 'id', attrs: {}, content: b('7000001') },
              { tag: 'retailer_id', attrs: {}, content: b('WAF-OREO') },
              { tag: 'name', attrs: {}, content: b('Waffle Oreo Rock') },
              { tag: 'description', attrs: {}, content: b('con helado') },
              { tag: 'price', attrs: {}, content: b('20000') },
              { tag: 'currency', attrs: {}, content: b('PEN') },
              { tag: 'media', attrs: {}, content: [{ tag: 'image', attrs: {}, content: [
                { tag: 'request_image_url', attrs: {}, content: b('https://r/chica.jpg') },
                { tag: 'original_image_url', attrs: {}, content: b('https://r/grande.jpg') },
              ] }] },
              { tag: 'status_info', attrs: {}, content: [{ tag: 'status', attrs: {}, content: b('APPROVED') }] },
            ],
          },
          { tag: 'product', attrs: { is_hidden: 'true' }, content: [{ tag: 'id', attrs: {}, content: b('7000002') }, { tag: 'name', attrs: {}, content: b('Oculto') }] },
          { tag: 'paging', attrs: {}, content: [{ tag: 'after', attrs: {}, content: b('cursor-2') }] },
        ],
      },
    ],
  };
  const leido = elCatalogoDelNodo(nodo);
  assert.equal(leido.products.length, 2);
  assert.deepEqual(leido.products[0], {
    id: '7000001', retailerId: 'WAF-OREO', name: 'Waffle Oreo Rock', description: 'con helado', price: 20000, currency: 'PEN',
    url: null, imageUrl: 'https://r/grande.jpg', isHidden: false, reviewStatus: 'APPROVED',
  });
  assert.equal(leido.products[1].isHidden, true);
  assert.equal(leido.products[1].retailerId, null);
  assert.equal(leido.nextPageCursor, 'cursor-2');
});

test('un nodo sin product_catalog (respuesta rara) da cero productos y sin cursor; el timeout NO llega acá: es 504 en el servicio', () => {
  assert.deepEqual(elCatalogoDelNodo({ tag: 'iq', attrs: {}, content: [] }), { products: [], nextPageCursor: null });
});

test('elJidSinDispositivo saca el :NN del jid propio', () => {
  assert.equal(elJidSinDispositivo('51999888777:12@s.whatsapp.net'), '51999888777@s.whatsapp.net');
  assert.equal(elJidSinDispositivo('51999888777@s.whatsapp.net'), '51999888777@s.whatsapp.net');
});

test('elIqDeBorrarProductos arma el product_catalog_delete de Baileys y losBorradosDelNodo lee deleted_count', () => {
  const iq = elIqDeBorrarProductos(['1', '2']);
  assert.equal(iq.attrs?.type, 'set');
  const del = (iq.content as NodoBinario[])[0];
  assert.equal(del.tag, 'product_catalog_delete');
  assert.equal((del.content as NodoBinario[]).length, 2);
  assert.equal(losBorradosDelNodo({ tag: 'iq', attrs: {}, content: [{ tag: 'product_catalog_delete', attrs: { deleted_count: '2' } }] }), 2);
  assert.equal(losBorradosDelNodo({ tag: 'iq', attrs: {}, content: [] }), 0);
});

// ─── R0b · el perfil de WhatsApp Business desde Smarty ───
import { elPerfilParaBaileys } from '@api/extensions/capacidades/capacidades.puro';

test('elPerfilParaBaileys: sólo lo que vino (delta), sitios hasta 2, horario en la forma de Baileys', () => {
  const p = elPerfilParaBaileys({
    address: '  Paradero Mercado de Lurín  ',
    description: '',
    websites: ['https://maps.app.goo.gl/x', '', 'https://wa.me/c/51941135592', 'https://extra'],
    hours: { timezone: 'America/Lima', days: [{ day: 'monday', mode: 'specific_hours', openTimeInMinutes: 780, closeTimeInMinutes: 1320 }, { day: 'sunday', mode: 'open_24h' }] },
  });
  assert.deepEqual(p, {
    address: 'Paradero Mercado de Lurín',
    websites: ['https://maps.app.goo.gl/x', 'https://wa.me/c/51941135592'],
    hours: { timezone: 'America/Lima', days: [{ day: 'monday', mode: 'specific_hours', openTimeInMinutes: 780, closeTimeInMinutes: 1320 }, { day: 'sunday', mode: 'open_24h' }] },
  });
  assert.deepEqual(elPerfilParaBaileys({}), {});
});
