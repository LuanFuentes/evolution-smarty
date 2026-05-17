import { InstanceDto } from '@api/dto/instance.dto';

import { PresenceSubscribeDto } from './presence-subscribe.dto';
import { PresenceSubscribeService } from './presence-subscribe.service';

export class PresenceSubscribeController {
  constructor(private readonly presenceSubscribeService: PresenceSubscribeService) {}

  public async presenceSubscribe(instance: InstanceDto, data: PresenceSubscribeDto) {
    return this.presenceSubscribeService.presenceSubscribe(instance, data);
  }
}
