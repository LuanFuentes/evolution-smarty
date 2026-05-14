import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';

import { AppStateCollection, ResyncAppStateDto } from './resync-app-state.dto';
import { DEFAULT_RESYNC_COLLECTIONS } from './resync-app-state.schema';

const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;

class BadGatewayException {
  constructor(...objectError: any[]) {
    throw {
      status: BAD_GATEWAY,
      error: 'Bad Gateway',
      message: objectError.length > 0 ? objectError : undefined,
    };
  }
}

class ServiceUnavailableException {
  constructor(...objectError: any[]) {
    throw {
      status: SERVICE_UNAVAILABLE,
      error: 'Service Unavailable',
      message: objectError.length > 0 ? objectError : undefined,
    };
  }
}

export class ResyncAppStateService {
  private readonly logger = new Logger('ResyncAppStateService');

  constructor(private readonly waMonitor: WAMonitoringService) {}

  public async resyncAppState({ instanceName }: InstanceDto, data: ResyncAppStateDto) {
    const waInstance = this.waMonitor.waInstances[instanceName];

    if (!waInstance) {
      throw new NotFoundException(`Instance "${instanceName}" not found`);
    }

    if (waInstance.integration !== Integration.WHATSAPP_BAILEYS) {
      throw new BadRequestException('Feature solo disponible en canales Baileys (no Cloud API)');
    }

    const state = waInstance.connectionStatus?.state;
    if (state !== 'open') {
      throw new ServiceUnavailableException(
        `Instance "${instanceName}" is not connected (state: ${state ?? 'unknown'})`,
      );
    }

    if (!waInstance.client || typeof waInstance.client.resyncAppState !== 'function') {
      throw new ServiceUnavailableException(`Baileys socket not ready for instance "${instanceName}"`);
    }

    const collections: readonly AppStateCollection[] =
      data.collections && data.collections.length > 0 ? data.collections : DEFAULT_RESYNC_COLLECTIONS;

    try {
      await waInstance.client.resyncAppState(collections, false);
      return { success: true, collections: [...collections] };
    } catch (error) {
      this.logger.error({ local: 'ResyncAppStateService.resyncAppState', error: error?.toString() });
      throw new BadGatewayException(`Baileys resyncAppState failed: ${error?.message ?? error?.toString()}`);
    }
  }
}
