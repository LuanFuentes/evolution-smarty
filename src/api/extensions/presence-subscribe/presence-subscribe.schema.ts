import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

export const presenceSubscribeSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    number: {
      type: 'string',
      minLength: 1,
      description: 'The "number" cannot be empty',
    },
  },
  required: ['number'],
};
