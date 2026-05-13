import { waMonitor } from '@api/server.module';
import { Logger } from '@config/logger.config';

import { PinController } from './pin/pin.controller';
import { PinService } from './pin/pin.service';
import { StarController } from './star/star.controller';
import { StarService } from './star/star.service';

const logger = new Logger('EXTENSIONS MODULE');

const starService = new StarService(waMonitor);
export const starController = new StarController(starService);

const pinService = new PinService(waMonitor);
export const pinController = new PinController(pinService);

logger.info('Extensions Module - ON');
