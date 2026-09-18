import { RouterBroker } from '@api/abstract/abstract.router';
import { CapacidadesBusinessRouter } from '@api/extensions/capacidades/capacidades.router';
import { businessExtController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';

import { CatalogoDto, OrderDetailsDto, ProductosABorrarDto } from './business.dto';
import { catalogoSchema, orderDetailsSchema, productosABorrarSchema } from './business.schema';

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

    /*
     * 🚨 getCatalog y productDelete PISAN a los de upstream/capacidades (este router se monta antes en index.router):
     * los de Baileys devuelven «0 productos» / «0 borrados» cuando WhatsApp no contesta (rc14 se traga el timeout;
     * #2717). Acá un timeout es 504 «WhatsApp no contestó». Ver business.service.ts y catalogo.puro.ts.
     */
    this.router.post(this.routerPath('getCatalog'), ...guards, async (req, res) => {
      const response = await this.dataValidate<CatalogoDto>({
        request: req,
        schema: catalogoSchema,
        ClassRef: CatalogoDto,
        execute: (instance, data) => businessExtController.getCatalog(instance, data),
      });

      return res.status(HttpStatus.OK).json(response);
    });

    this.router.post(this.routerPath('productDelete'), ...guards, async (req, res) => {
      const response = await this.dataValidate<ProductosABorrarDto>({
        request: req,
        schema: productosABorrarSchema,
        ClassRef: ProductosABorrarDto,
        execute: (instance, data) => businessExtController.productDelete(instance, data),
      });

      return res.status(HttpStatus.OK).json(response);
    });

    this.router.use(new CapacidadesBusinessRouter(...guards).router); // POST productCreate · productUpdate (productDelete queda arriba)
  }

  public readonly router: Router = Router();
}
