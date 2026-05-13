import { waMonitor } from '@api/server.module';
import { Logger } from '@config/logger.config';

import { CatalogController } from './catalog/catalog.controller';
import { CatalogService } from './catalog/catalog.service';
import { EditController } from './edit/edit.controller';
import { EditService } from './edit/edit.service';
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

const catalogService = new CatalogService(waMonitor);
export const catalogController = new CatalogController(catalogService);

logger.info('Extensions Module - ON');
