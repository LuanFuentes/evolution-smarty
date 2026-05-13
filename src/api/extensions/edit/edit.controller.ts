import { InstanceDto } from '@api/dto/instance.dto';

import { EditMessageDto } from './edit.dto';
import { EditService } from './edit.service';

export class EditController {
  constructor(private readonly editService: EditService) {}

  public async editMessage(instance: InstanceDto, data: EditMessageDto) {
    return this.editService.editMessage(instance, data);
  }
}
