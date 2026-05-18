import { RouterBroker } from '@api/abstract/abstract.router';
import { privacyTokensController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';

import { DebugPrivacyTokensDto } from './privacy-tokens.dto';
import { debugPrivacyTokensSchema } from './privacy-tokens.schema';

export class PrivacyTokensRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router.post(this.routerPath('debugPrivacyTokens'), ...guards, async (req, res) => {
      const response = await this.dataValidate<DebugPrivacyTokensDto>({
        request: req,
        schema: debugPrivacyTokensSchema,
        ClassRef: DebugPrivacyTokensDto,
        execute: (instance, data) => privacyTokensController.debugPrivacyTokens(instance, data),
      });

      return res.status(HttpStatus.OK).json(response);
    });
  }

  public readonly router: Router = Router();
}
