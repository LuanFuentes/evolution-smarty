import { RouterBroker } from '@api/abstract/abstract.router';
import { eventosController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';

import { GroupJoinRequestsDto, UpdateGroupJoinRequestsDto } from './eventos.dto';
import { groupJoinRequestsSchema, updateGroupJoinRequestsSchema } from './eventos.schema';

/** Montado en /group después del GroupRouter del core (capa paralela, como /chat y /message). */
export class GroupExtensionsRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    // POST /group/joinRequests/{instance} — { groupJid } → solicitudes pendientes de entrar.
    this.router.post(this.routerPath('joinRequests'), ...guards, async (req, res) => {
      const response = await this.dataValidate<GroupJoinRequestsDto>({
        request: req,
        schema: groupJoinRequestsSchema,
        ClassRef: GroupJoinRequestsDto,
        execute: (instance, data) => eventosController.groupJoinRequests(instance, data),
      });
      return res.status(HttpStatus.OK).json(response);
    });
    // POST /group/updateJoinRequests/{instance} — { groupJid, participants, action: approve|reject }.
    this.router.post(this.routerPath('updateJoinRequests'), ...guards, async (req, res) => {
      const response = await this.dataValidate<UpdateGroupJoinRequestsDto>({
        request: req,
        schema: updateGroupJoinRequestsSchema,
        ClassRef: UpdateGroupJoinRequestsDto,
        execute: (instance, data) => eventosController.updateGroupJoinRequests(instance, data),
      });
      return res.status(HttpStatus.OK).json(response);
    });
  }

  public readonly router: Router = Router();
}
