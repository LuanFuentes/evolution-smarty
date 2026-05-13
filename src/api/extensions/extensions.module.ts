import { waMonitor } from '@api/server.module';
import { Logger } from '@config/logger.config';

import { StarController } from './star/star.controller';
import { StarService } from './star/star.service';

const logger = new Logger('EXTENSIONS MODULE');

const starService = new StarService(waMonitor);
export const starController = new StarController(starService);

logger.info('Extensions Module - ON');
