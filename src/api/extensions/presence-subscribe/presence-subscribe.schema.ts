import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

export const presenceSubscribeSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    jid: {
      type: 'string',
      minLength: 1,
      description: 'JID exacto del contacto (ej. 1234@lid o 51999...@s.whatsapp.net)',
    },
    number: {
      type: 'string',
      minLength: 1,
      description: 'Número a resolver si no se pasa jid',
    },
  },
  anyOf: [{ required: ['jid'] }, { required: ['number'] }],
  description: 'Debe incluir "jid" (preferido) o "number"',
};
