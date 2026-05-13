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
