import { RouterBroker } from '@api/abstract/abstract.router';
import { InstanceDto } from '@api/dto/instance.dto';
import { eventosController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Response, Router } from 'express';

import { LidMappingDto } from './eventos.dto';
import { lidMappingSchema } from './eventos.schema';

/** Un GET sin cuerpo: sólo la instancia. Los errores con `status` (404/400/503/502) salen tal cual. */
async function responder(res: Response, correr: () => Promise<unknown>) {
  try {
    return res.status(HttpStatus.OK).json(await correr());
  } catch (error: any) {
    if (error?.status) return res.status(error.status).json(error);
    return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: [error?.message ?? String(error)],
    });
  }
}

/** Montado dentro de ChatExtensionsRouter (/chat). */
export class EventosChatRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    // GET /chat/fetchNewChatMessageCap/{instance} — el cupo de chats nuevos del ciclo.
    this.router.get(this.routerPath('fetchNewChatMessageCap'), ...guards, (req, res) =>
      responder(res, () => eventosController.fetchNewChatMessageCap(req.params as unknown as InstanceDto)),
    );
    // GET /chat/fetchBlocklist/{instance} — los bloqueados desde el teléfono.
    this.router.get(this.routerPath('fetchBlocklist'), ...guards, (req, res) =>
      responder(res, () => eventosController.fetchBlocklist(req.params as unknown as InstanceDto)),
    );
    // POST /chat/lidMapping/{instance} — { jids } → pares LID ↔ teléfono.
    this.router.post(this.routerPath('lidMapping'), ...guards, async (req, res) => {
      const response = await this.dataValidate<LidMappingDto>({
        request: req,
        schema: lidMappingSchema,
        ClassRef: LidMappingDto,
        execute: (instance, data) => eventosController.lidMapping(instance, data),
      });
      return res.status(HttpStatus.OK).json(response);
    });
  }

  public readonly router: Router = Router();
}
