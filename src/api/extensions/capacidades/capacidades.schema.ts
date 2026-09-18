import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

const medio: JSONSchema7 = {
  type: 'object',
  properties: {
    url: { type: 'string', minLength: 8, pattern: '^https?://' },
    base64: { type: 'string', minLength: 16 },
    mimetype: { type: 'string' },
    caption: { type: 'string' },
  },
  anyOf: [{ required: ['url'] }, { required: ['base64'] }],
};

export const sendAlbumSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    number: { type: 'string', minLength: 5 },
    jid: { type: 'string', pattern: '@(lid|s\\.whatsapp\\.net|c\\.us|g\\.us)$' },
    items: { type: 'array', minItems: 2, maxItems: 30, items: medio },
    delay: { type: 'integer', minimum: 0, maximum: 5000 },
  },
  required: ['items'],
  anyOf: [{ required: ['number'] }, { required: ['jid'] }],
};

export const sendProductSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    number: { type: 'string', minLength: 5 },
    jid: { type: 'string', pattern: '@(lid|s\\.whatsapp\\.net|c\\.us|g\\.us)$' },
    product: {
      type: 'object',
      properties: {
        productId: { type: 'string', minLength: 1, maxLength: 100 },
        title: { type: 'string', minLength: 1, maxLength: 200 },
        description: { type: 'string', maxLength: 5000 },
        currencyCode: { type: 'string', minLength: 3, maxLength: 3 },
        price: { type: 'number', minimum: 0 },
        retailerId: { type: 'string', maxLength: 100 },
        url: { type: 'string', pattern: '^https?://' },
        image: medio,
      },
      required: ['productId', 'title', 'currencyCode', 'price', 'image'],
    },
    businessOwnerJid: { type: 'string', pattern: '@(s\\.whatsapp\\.net|c\\.us)$' },
    body: { type: 'string', maxLength: 1024 },
    footer: { type: 'string', maxLength: 60 },
  },
  required: ['product'],
  anyOf: [{ required: ['number'] }, { required: ['jid'] }],
};

export const quickReplySchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    shortcut: { type: 'string', minLength: 1, maxLength: 25, pattern: '^[^\\s/]+$' },
    message: { type: 'string', minLength: 1, maxLength: 4096 },
    keywords: { type: 'array', maxItems: 5, items: { type: 'string', minLength: 1, maxLength: 25 } },
    timestamp: { type: 'string', pattern: '^\\d{6,}$' },
  },
  required: ['shortcut', 'message'],
};

export const removeQuickReplySchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: { timestamp: { type: 'string', pattern: '^\\d{6,}$' } },
  required: ['timestamp'],
};

const producto = {
  name: { type: 'string' as const, minLength: 1, maxLength: 200 },
  description: { type: 'string' as const, maxLength: 5000 },
  price: { type: 'number' as const, minimum: 0 },
  currency: { type: 'string' as const, minLength: 3, maxLength: 3 },
  retailerId: { type: 'string' as const, maxLength: 100 },
  url: { type: 'string' as const, pattern: '^https?://' },
  isHidden: { type: 'boolean' as const },
  originCountryCode: { type: 'string' as const, minLength: 2, maxLength: 2 },
  images: { type: 'array' as const, minItems: 1, maxItems: 10, items: medio },
};

export const productCreateSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: producto,
  required: ['name', 'description', 'price', 'currency', 'images'],
};

export const productUpdateSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: { ...producto, productId: { type: 'string', minLength: 1 } },
  required: ['productId', 'name', 'description', 'price', 'currency', 'images'],
};

export const productDeleteSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: { productIds: { type: 'array', minItems: 1, maxItems: 50, items: { type: 'string', minLength: 1 } } },
  required: ['productIds'],
};
