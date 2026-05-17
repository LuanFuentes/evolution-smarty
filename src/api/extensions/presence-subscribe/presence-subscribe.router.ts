import { RouterBroker } from '@api/abstract/abstract.router';
import { presenceSubscribeController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';

import { PresenceSubscribeDto } from './presence-subscribe.dto';
import { presenceSubscribeSchema } from './presence-subscribe.schema';

export class PresenceSubscribeRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router.post(this.routerPath('presenceSubscribe'), ...guards, async (req, res) => {
      const response = await this.dataValidate<PresenceSubscribeDto>({
        request: req,
        schema: presenceSubscribeSchema,
        ClassRef: PresenceSubscribeDto,
        execute: (instance, data) => presenceSubscribeController.presenceSubscribe(instance, data),
      });

      return res.status(HttpStatus.OK).json(response);
    });
  }

  public readonly router: Router = Router();
}
