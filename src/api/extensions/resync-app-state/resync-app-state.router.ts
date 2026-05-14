import { RouterBroker } from '@api/abstract/abstract.router';
import { resyncAppStateController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';

import { ResyncAppStateDto } from './resync-app-state.dto';
import { resyncAppStateSchema } from './resync-app-state.schema';

export class ResyncAppStateRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router.post(this.routerPath('resyncAppState'), ...guards, async (req, res) => {
      const response = await this.dataValidate<ResyncAppStateDto>({
        request: req,
        schema: resyncAppStateSchema,
        ClassRef: ResyncAppStateDto,
        execute: (instance, data) => resyncAppStateController.resyncAppState(instance, data),
      });

      return res.status(HttpStatus.OK).json(response);
    });
  }

  public readonly router: Router = Router();
}
