export type AppStateCollection = 'critical_block' | 'critical_unblock_low' | 'regular_high' | 'regular_low' | 'regular';

export class ResyncAppStateDto {
  collections?: AppStateCollection[];
}
