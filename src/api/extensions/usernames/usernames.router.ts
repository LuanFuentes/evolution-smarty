import { RouterBroker } from '@api/abstract/abstract.router';
import { usernamesController } from '@api/extensions/extensions.module';
import { HttpStatus } from '@api/routes/index.router';
import { RequestHandler, Router } from 'express';

import { ResolveUsernameDto } from './usernames.dto';
import { resolveUsernameSchema } from './usernames.schema';

export class UsernamesRouter extends RouterBroker {
  constructor(...guards: RequestHandler[]) {
    super();
    // POST /chat/resolveUsername/{instance} — el equivalente de whatsappNumbers, pero por @usuario.
    this.router.post(this.routerPath('resolveUsername'), ...guards, async (req, res) => {
      const response = await this.dataValidate<ResolveUsernameDto>({
        request: req,
        schema: resolveUsernameSchema,
        ClassRef: ResolveUsernameDto,
        execute: (instance, data) => usernamesController.resolveUsername(instance, data),
      });

      return res.status(HttpStatus.OK).json(response);
    });
  }

  public readonly router: Router = Router();
}
