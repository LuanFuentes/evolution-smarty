import { InstanceDto } from '@api/dto/instance.dto';

import { StarMessageDto } from './star.dto';
import { StarService } from './star.service';

export class StarController {
  constructor(private readonly starService: StarService) {}

  public async starMessage(instance: InstanceDto, data: StarMessageDto) {
    return this.starService.starMessage(instance, data);
  }
}
