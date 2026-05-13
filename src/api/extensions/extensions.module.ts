import { prismaRepository, waMonitor } from '@api/server.module';
import { Logger } from '@config/logger.config';

import { BusinessExtController } from './business/business.controller';
import { BusinessService } from './business/business.service';
import { EditController } from './edit/edit.controller';
import { EditService } from './edit/edit.service';
import { ChatLabelsController } from './label/chat-labels.controller';
import { ChatLabelsService } from './label/chat-labels.service';
import { PinController } from './pin/pin.controller';
import { PinService } from './pin/pin.service';
import { StarController } from './star/star.controller';
import { StarService } from './star/star.service';

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

logger.info('Extensions Module - ON');
