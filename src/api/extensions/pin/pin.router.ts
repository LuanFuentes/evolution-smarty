import { RouterBroker } from '@api/abstract/abstract.router';
import { EditMessageRouter } from '@api/extensions/edit/edit.router';
import { pinController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';

import { PinMessageDto } from './pin.dto';
import { pinMessageSchema } from './pin.schema';

export class MessageExtensionsRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router.post(this.routerPath('pin'), ...guards, async (req, res) => {
      const response = await this.dataValidate<PinMessageDto>({
        request: req,
        schema: pinMessageSchema,
        ClassRef: PinMessageDto,
        execute: (instance, data) => pinController.pinMessage(instance, data),
      });

      return res.status(HttpStatus.OK).json(response);
    });

    this.router.use(new EditMessageRouter(...guards).router);
  }

  public readonly router: Router = Router();
}
