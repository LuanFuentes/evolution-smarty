import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

export const editMessageSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    key: {
      type: 'object',
      properties: {
        id: { type: 'string', minLength: 1, description: 'The "key.id" cannot be empty' },
        remoteJid: { type: 'string', minLength: 1, description: 'The "key.remoteJid" cannot be empty' },
        fromMe: {
          type: 'boolean',
          enum: [true],
          description: 'Solo se pueden editar mensajes propios (fromMe debe ser true)',
        },
      },
      required: ['id', 'remoteJid', 'fromMe'],
      description: 'The "key" must include id, remoteJid and fromMe=true',
    },
    text: {
      type: 'string',
      minLength: 1,
      maxLength: 4096,
      description: 'The "text" must be 1..4096 chars',
    },
  },
  required: ['key', 'text'],
};
