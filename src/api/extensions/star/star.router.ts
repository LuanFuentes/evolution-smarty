import { RouterBroker } from '@api/abstract/abstract.router';
import { starController } from '@api/extensions/extensions.module';
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
  }

  public readonly router: Router = Router();
}
