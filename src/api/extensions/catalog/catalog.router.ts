import { RouterBroker } from '@api/abstract/abstract.router';
import { InstanceDto } from '@api/dto/instance.dto';
import { catalogController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';

import {
  CATALOG_LIMIT_DEFAULT,
  CATALOG_LIMIT_MAX,
  CATALOG_LIMIT_MIN,
  COLLECTIONS_LIMIT_DEFAULT,
  COLLECTIONS_LIMIT_MAX,
  COLLECTIONS_LIMIT_MIN,
  parseAndValidateLimit,
  validateJid,
} from './catalog.schema';

export class CatalogExtensionsRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();

    this.router.get(this.routerPath('find'), ...guards, async (req, res) => {
      try {
        const instance = req.params as unknown as InstanceDto;
        const jid = validateJid(req.query.jid);
        const limit = parseAndValidateLimit(req.query.limit, {
          min: CATALOG_LIMIT_MIN,
          max: CATALOG_LIMIT_MAX,
          def: CATALOG_LIMIT_DEFAULT,
        });
        const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;

        const response = await catalogController.findCatalog(instance, { jid, limit, cursor });
        return res.status(HttpStatus.OK).json(response);
      } catch (error: any) {
        if (error?.status) {
          return res.status(error.status).json(error);
        }
        return res.status(HttpStatus.BAD_REQUEST).json({
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: [error?.message ?? String(error)],
        });
      }
    });

    this.router.get(this.routerPath('findCollections'), ...guards, async (req, res) => {
      try {
        const instance = req.params as unknown as InstanceDto;
        const jid = validateJid(req.query.jid);
        const limit = parseAndValidateLimit(req.query.limit, {
          min: COLLECTIONS_LIMIT_MIN,
          max: COLLECTIONS_LIMIT_MAX,
          def: COLLECTIONS_LIMIT_DEFAULT,
        });

        const response = await catalogController.findCollections(instance, { jid, limit });
        return res.status(HttpStatus.OK).json(response);
      } catch (error: any) {
        if (error?.status) {
          return res.status(error.status).json(error);
        }
        return res.status(HttpStatus.BAD_REQUEST).json({
          status: HttpStatus.BAD_REQUEST,
          error: 'Bad Request',
          message: [error?.message ?? String(error)],
        });
      }
    });
  }

  public readonly router: Router = Router();
}
