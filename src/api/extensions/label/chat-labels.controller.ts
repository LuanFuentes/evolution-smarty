import { InstanceDto } from '@api/dto/instance.dto';

import { ChatLabelsService } from './chat-labels.service';

export class ChatLabelsController {
  constructor(private readonly chatLabelsService: ChatLabelsService) {}

  public async getChatLabels(instance: InstanceDto) {
    return this.chatLabelsService.getChatLabels(instance);
  }
}
