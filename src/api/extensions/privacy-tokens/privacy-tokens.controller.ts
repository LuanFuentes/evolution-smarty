import { InstanceDto } from '@api/dto/instance.dto';

import { DebugPrivacyTokensDto } from './privacy-tokens.dto';
import { PrivacyTokensService } from './privacy-tokens.service';

export class PrivacyTokensController {
  constructor(private readonly privacyTokensService: PrivacyTokensService) {}

  public async debugPrivacyTokens(instance: InstanceDto, data: DebugPrivacyTokensDto) {
    return this.privacyTokensService.debugPrivacyTokens(instance, data);
  }
}
