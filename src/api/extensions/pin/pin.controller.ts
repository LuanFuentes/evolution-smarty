import { InstanceDto } from '@api/dto/instance.dto';

import { PinMessageDto } from './pin.dto';
import { PinService } from './pin.service';

export class PinController {
  constructor(private readonly pinService: PinService) {}

  public async pinMessage(instance: InstanceDto, data: PinMessageDto) {
    return this.pinService.pinMessage(instance, data);
  }
}
