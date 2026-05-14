import { JSONSchema7 } from 'json-schema';
import { v4 } from 'uuid';

export const APP_STATE_COLLECTIONS = [
  'critical_block',
  'critical_unblock_low',
  'regular_high',
  'regular_low',
  'regular',
] as const;

export const DEFAULT_RESYNC_COLLECTIONS = ['regular_high', 'regular'] as const;

export const resyncAppStateSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    collections: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: {
        type: 'string',
        enum: [...APP_STATE_COLLECTIONS],
      },
      description:
        'Lista de colecciones a resincronizar. Default: ["regular_high", "regular"]. Valores válidos: ' +
        APP_STATE_COLLECTIONS.join(', '),
    },
  },
};
