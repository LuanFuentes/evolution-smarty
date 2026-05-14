import { InstanceDto } from '@api/dto/instance.dto';

import { ResyncAppStateDto } from './resync-app-state.dto';
import { ResyncAppStateService } from './resync-app-state.service';

export class ResyncAppStateController {
  constructor(private readonly resyncAppStateService: ResyncAppStateService) {}

  public async resyncAppState(instance: InstanceDto, data: ResyncAppStateDto) {
    return this.resyncAppStateService.resyncAppState(instance, data);
  }
}
