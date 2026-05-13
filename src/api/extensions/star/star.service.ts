import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';

import { StarMessageDto } from './star.dto';

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

export class StarService {
  private readonly logger = new Logger('StarService');

  constructor(private readonly waMonitor: WAMonitoringService) {}

  public async starMessage({ instanceName }: InstanceDto, data: StarMessageDto) {
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

    if (!waInstance.client || typeof waInstance.client.chatModify !== 'function') {
      throw new ServiceUnavailableException(`Baileys socket not ready for instance "${instanceName}"`);
    }

    try {
      await waInstance.client.chatModify(
        {
          star: {
            messages: [{ id: data.key.id, fromMe: data.key.fromMe }],
            star: data.star,
          },
        },
        data.key.remoteJid,
      );

      return {
        starred: data.star,
        key: data.key,
      };
    } catch (error) {
      this.logger.error({ local: 'StarService.starMessage', error: error?.toString() });
      throw new BadGatewayException(`Baileys chatModify failed: ${error?.message ?? error?.toString()}`);
    }
  }
}
