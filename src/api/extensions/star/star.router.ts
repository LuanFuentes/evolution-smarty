import { RouterBroker } from '@api/abstract/abstract.router';
import { starController } from '@api/extensions/extensions.module';
import { PresenceSubscribeRouter } from '@api/extensions/presence-subscribe/presence-subscribe.router';
import { PrivacyTokensRouter } from '@api/extensions/privacy-tokens/privacy-tokens.router';
import { ResyncAppStateRouter } from '@api/extensions/resync-app-state/resync-app-state.router';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';

import { StarMessageDto } from './star.dto';
import { starMessageSchema } from './star.schema';

export class ChatExtensionsRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router.post(this.routerPath('starMessage'), ...guards, async (req, res) => {
      const response = await this.dataValidate<StarMessageDto>({
        request: req,
        schema: starMessageSchema,
        ClassRef: StarMessageDto,
        execute: (instance, data) => starController.starMessage(instance, data),
      });

      return res.status(HttpStatus.OK).json(response);
    });

    this.router.use(new ResyncAppStateRouter(...guards).router);
    this.router.use(new PresenceSubscribeRouter(...guards).router);
    this.router.use(new PrivacyTokensRouter(...guards).router);
  }

  public readonly router: Router = Router();
}
