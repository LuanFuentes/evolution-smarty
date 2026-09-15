import { InstanceDto } from '@api/dto/instance.dto';

import { GroupJoinRequestsDto, LidMappingDto, UpdateGroupJoinRequestsDto } from './eventos.dto';
import { EventosService } from './eventos.service';

export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  public fetchNewChatMessageCap(instance: InstanceDto) {
    return this.eventosService.fetchNewChatMessageCap(instance);
  }

  public fetchBlocklist(instance: InstanceDto) {
    return this.eventosService.fetchBlocklist(instance);
  }

  public lidMapping(instance: InstanceDto, data: LidMappingDto) {
    return this.eventosService.lidMapping(instance, data);
  }

  public groupJoinRequests(instance: InstanceDto, data: GroupJoinRequestsDto) {
    return this.eventosService.groupJoinRequests(instance, data);
  }

  public updateGroupJoinRequests(instance: InstanceDto, data: UpdateGroupJoinRequestsDto) {
    return this.eventosService.updateGroupJoinRequests(instance, data);
  }
}
