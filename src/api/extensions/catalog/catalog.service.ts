import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';

import { FindCatalogParams, FindCollectionsParams } from './catalog.dto';

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

export class CatalogService {
  private readonly logger = new Logger('CatalogService');

  constructor(private readonly waMonitor: WAMonitoringService) {}

  private assertConnectedBaileys(instanceName: string) {
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
    if (
      !waInstance.client ||
      typeof waInstance.client.getCatalog !== 'function' ||
      typeof waInstance.client.getCollections !== 'function'
    ) {
      throw new ServiceUnavailableException(`Baileys socket not ready for instance "${instanceName}"`);
    }
    return waInstance;
  }

  public async findCatalog({ instanceName }: InstanceDto, params: FindCatalogParams) {
    const waInstance = this.assertConnectedBaileys(instanceName);

    try {
      const result = await waInstance.client.getCatalog({
        jid: params.jid,
        limit: params.limit,
        cursor: params.cursor as any,
      });

      return {
        products: result?.products ?? [],
        nextPageCursor: result?.nextPageCursor,
      };
    } catch (error) {
      this.logger.error({ local: 'CatalogService.findCatalog', error: error?.toString() });
      throw new BadGatewayException(`Baileys getCatalog failed: ${error?.message ?? error?.toString()}`);
    }
  }

  public async findCollections({ instanceName }: InstanceDto, params: FindCollectionsParams) {
    const waInstance = this.assertConnectedBaileys(instanceName);

    try {
      const result = await waInstance.client.getCollections(params.jid, params.limit);

      return {
        collections: result?.collections ?? [],
      };
    } catch (error) {
      this.logger.error({ local: 'CatalogService.findCollections', error: error?.toString() });
      throw new BadGatewayException(`Baileys getCollections failed: ${error?.message ?? error?.toString()}`);
    }
  }
}
