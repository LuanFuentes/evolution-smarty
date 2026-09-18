import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

export const orderDetailsSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    orderId: {
      type: 'string',
      minLength: 1,
      description: 'The "orderId" cannot be empty',
    },
    tokenBase64: {
      type: 'string',
      minLength: 1,
      description: 'The "tokenBase64" cannot be empty',
    },
  },
  required: ['orderId', 'tokenBase64'],
};

export const catalogoSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    number: { type: 'string' },
    limit: { type: 'integer', minimum: 1, maximum: 100 },
  },
};

export const productosABorrarSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    productIds: { type: 'array', minItems: 1, items: { type: 'string', minLength: 1 } },
  },
  required: ['productIds'],
};
