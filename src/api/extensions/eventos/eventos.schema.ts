import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

const grupo = { type: 'string' as const, minLength: 5, pattern: '@g\\.us$' };

export const lidMappingSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    jids: {
      type: 'array',
      minItems: 1,
      maxItems: 200,
      items: { type: 'string', minLength: 5, pattern: '@(lid|s\\.whatsapp\\.net|c\\.us)$' },
    },
  },
  required: ['jids'],
};

export const groupJoinRequestsSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: { groupJid: grupo },
  required: ['groupJid'],
};

export const updateGroupJoinRequestsSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    groupJid: grupo,
    participants: { type: 'array', minItems: 1, maxItems: 100, items: { type: 'string', minLength: 5 } },
    action: { type: 'string', enum: ['approve', 'reject'] },
  },
  required: ['groupJid', 'participants', 'action'],
};
