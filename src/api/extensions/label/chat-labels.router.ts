import { RouterBroker } from '@api/abstract/abstract.router';
import { InstanceDto } from '@api/dto/instance.dto';
import { chatLabelsController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';

export class LabelExtensionsRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router.get(this.routerPath('getChatLabels'), ...guards, async (req, res) => {
      try {
        const instance = req.params as unknown as InstanceDto;
        const response = await chatLabelsController.getChatLabels(instance);
        return res.status(HttpStatus.OK).json(response);
      } catch (error: any) {
        if (error?.status) {
          return res.status(error.status).json(error);
        }
        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Internal Server Error',
          message: [error?.message ?? String(error)],
        });
      }
    });
  }

  public readonly router: Router = Router();
}
