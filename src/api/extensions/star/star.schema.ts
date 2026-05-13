import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

export const starMessageSchema: JSONSchema7 = {
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
    star: {
      type: 'boolean',
      enum: [true, false],
      description: 'The "star" must be true (to star) or false (to unstar)',
    },
  },
  required: ['key', 'star'],
};
