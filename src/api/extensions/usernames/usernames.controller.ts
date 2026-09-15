import { InstanceDto } from '@api/dto/instance.dto';

import { ResolveUsernameDto } from './usernames.dto';
import { UsernamesService } from './usernames.service';

export class UsernamesController {
  constructor(private readonly usernamesService: UsernamesService) {}

  public async resolveUsername(instance: InstanceDto, data: ResolveUsernameDto) {
    return this.usernamesService.resolveUsername(instance, data);
  }
}
