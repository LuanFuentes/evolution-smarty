import { prismaRepository, waMonitor } from '@api/server.module';
import { Logger } from '@config/logger.config';

import { BusinessExtController } from './business/business.controller';
import { BusinessService } from './business/business.service';
import { CapacidadesController } from './capacidades/capacidades.controller';
import { CapacidadesService } from './capacidades/capacidades.service';
import { EditController } from './edit/edit.controller';
import { EditService } from './edit/edit.service';
import { EventosController } from './eventos/eventos.controller';
import { EventosService } from './eventos/eventos.service';
import { ChatLabelsController } from './label/chat-labels.controller';
import { ChatLabelsService } from './label/chat-labels.service';
import { PinController } from './pin/pin.controller';
import { PinService } from './pin/pin.service';
import { PresenceSubscribeController } from './presence-subscribe/presence-subscribe.controller';
import { PresenceSubscribeService } from './presence-subscribe/presence-subscribe.service';
import { PrivacyTokensController } from './privacy-tokens/privacy-tokens.controller';
import { PrivacyTokensService } from './privacy-tokens/privacy-tokens.service';
import { ResyncAppStateController } from './resync-app-state/resync-app-state.controller';
import { ResyncAppStateService } from './resync-app-state/resync-app-state.service';
import { StarController } from './star/star.controller';
import { StarService } from './star/star.service';
import { UsernamesController } from './usernames/usernames.controller';
import { UsernamesService } from './usernames/usernames.service';

const logger = new Logger('EXTENSIONS MODULE');

const starService = new StarService(waMonitor);
export const starController = new StarController(starService);

const pinService = new PinService(waMonitor);
export const pinController = new PinController(pinService);

const editService = new EditService(waMonitor);
export const editController = new EditController(editService);

const businessExtService = new BusinessService(waMonitor);
export const businessExtController = new BusinessExtController(businessExtService);

const chatLabelsService = new ChatLabelsService(prismaRepository);
export const chatLabelsController = new ChatLabelsController(chatLabelsService);

const resyncAppStateService = new ResyncAppStateService(waMonitor);
export const resyncAppStateController = new ResyncAppStateController(resyncAppStateService);

const presenceSubscribeService = new PresenceSubscribeService(waMonitor);
export const presenceSubscribeController = new PresenceSubscribeController(presenceSubscribeService);

const privacyTokensService = new PrivacyTokensService(waMonitor);
export const privacyTokensController = new PrivacyTokensController(privacyTokensService);

const usernamesService = new UsernamesService(waMonitor);
export const usernamesController = new UsernamesController(usernamesService);

const eventosService = new EventosService(waMonitor);
export const eventosController = new EventosController(eventosService);

const capacidadesService = new CapacidadesService(waMonitor);
export const capacidadesController = new CapacidadesController(capacidadesService);

logger.info('Extensions Module - ON');
