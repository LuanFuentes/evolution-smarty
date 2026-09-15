import { RouterBroker } from '@api/abstract/abstract.router';
import { capacidadesController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';
import { JSONSchema7 } from 'json-schema';

import {
  ProductCreateDto,
  ProductDeleteDto,
  ProductUpdateDto,
  QuickReplyDto,
  RemoveQuickReplyDto,
  SendAlbumDto,
} from './capacidades.dto';
import {
  productCreateSchema,
  productDeleteSchema,
  productUpdateSchema,
  quickReplySchema,
  removeQuickReplySchema,
  sendAlbumSchema,
} from './capacidades.schema';

type Ejecutar<T> = (instance: { instanceName: string }, data: T) => Promise<unknown>;

/** Un POST validado por esquema, montado con el mismo molde que el resto de las extensiones. */
function post<T>(
  router: RouterBroker & { router: Router },
  path: string,
  guards: RequestHandler[],
  schema: JSONSchema7,
  ClassRef: new () => T,
  execute: Ejecutar<T>,
) {
  router.router.post(router.routerPath(path), ...guards, async (req, res) => {
    const response = await router.dataValidate<T>({
      request: req,
      schema,
      ClassRef,
      execute: (instance, data) => execute(instance, data),
    });
    return res.status(HttpStatus.OK).json(response);
  });
}

/** Dentro de MessageExtensionsRouter (/message). */
export class CapacidadesMessageRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    post(this, 'sendAlbum', guards, sendAlbumSchema, SendAlbumDto, (i, d) => capacidadesController.sendAlbum(i, d));
  }

  public readonly router: Router = Router();
}

/** Dentro de ChatExtensionsRouter (/chat). */
export class CapacidadesChatRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    post(this, 'quickReply', guards, quickReplySchema, QuickReplyDto, (i, d) => capacidadesController.quickReply(i, d));
    post(this, 'removeQuickReply', guards, removeQuickReplySchema, RemoveQuickReplyDto, (i, d) =>
      capacidadesController.removeQuickReply(i, d),
    );
  }

  public readonly router: Router = Router();
}

/** Dentro de BusinessExtensionsRouter (/business). */
export class CapacidadesBusinessRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    post(this, 'productCreate', guards, productCreateSchema, ProductCreateDto, (i, d) =>
      capacidadesController.productCreate(i, d),
    );
    post(this, 'productUpdate', guards, productUpdateSchema, ProductUpdateDto, (i, d) =>
      capacidadesController.productUpdate(i, d),
    );
    post(this, 'productDelete', guards, productDeleteSchema, ProductDeleteDto, (i, d) =>
      capacidadesController.productDelete(i, d),
    );
  }

  public readonly router: Router = Router();
}
