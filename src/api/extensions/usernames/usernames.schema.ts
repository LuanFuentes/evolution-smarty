import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

export const resolveUsernameSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    username: {
      type: 'string',
      minLength: 3,
      maxLength: 64,
      description: 'El @usuario de WhatsApp, con o sin arroba (ej. "luan.fuentes")',
    },
    usernameKey: {
      type: 'string',
      minLength: 1,
      maxLength: 32,
      description: 'Opcional: el PIN del usuario, si lo exige',
    },
  },
  required: ['username'],
};
