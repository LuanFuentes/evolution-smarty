import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

export const pinMessageSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    key: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, description: 'The "key.id" cannot be empty' },
        remoteJid: { type: 'string', minLength: 1, description: 'The "key.remoteJid" cannot be empty' },
        fromMe: { type: 'boolean', enum: [true, false] },
      },
      required: ['id', 'remoteJid', 'fromMe'],
      description: 'The "key" must include id, remoteJid and fromMe',
    },
    type: {
      type: 'integer',
      enum: [1, 2],
      description: 'The "type" must be 1 (pin) or 2 (unpin)',
    },
    time: {
      type: 'number',
      minimum: 1,
      description: 'The "time" (seconds) must be a positive number when pinning',
    },
  },
  required: ['key', 'type'],
  allOf: [
    {
      if: {
        properties: { type: { const: 1 } },
        required: ['type'],
      },
      then: {
        required: ['time'],
      },
    },
  ],
};
