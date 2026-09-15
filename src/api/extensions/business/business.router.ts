import { RouterBroker } from '@api/abstract/abstract.router';
import { CapacidadesBusinessRouter } from '@api/extensions/capacidades/capacidades.router';
import { businessExtController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';

import { OrderDetailsDto } from './business.dto';
import { orderDetailsSchema } from './business.schema';

export class BusinessExtensionsRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    this.router.post(this.routerPath('getOrderDetails'), ...guards, async (req, res) => {
      const response = await this.dataValidate<OrderDetailsDto>({
        request: req,
        schema: orderDetailsSchema,
        ClassRef: OrderDetailsDto,
        execute: (instance, data) => businessExtController.getOrderDetails(instance, data),
      });

      return res.status(HttpStatus.OK).json(response);
    });

    this.router.use(new CapacidadesBusinessRouter(...guards).router); // POST productCreate · productUpdate · productDelete
  }

  public readonly router: Router = Router();
}
