import { RouterBroker } from '@api/abstract/abstract.router';
import { editController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';

import { EditMessageDto } from './edit.dto';
import { editMessageSchema } from './edit.schema';

export class EditMessageRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router.post(this.routerPath('editMessage'), ...guards, async (req, res) => {
      const response = await this.dataValidate<EditMessageDto>({
        request: req,
        schema: editMessageSchema,
        ClassRef: EditMessageDto,
        execute: (instance, data) => editController.editMessage(instance, data),
      });

      return res.status(HttpStatus.OK).json(response);
    });
  }

  public readonly router: Router = Router();
}
