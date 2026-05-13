import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';
import { AnyMessageContent } from 'baileys';

import { PinMessageDto } from './pin.dto';

const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;

const PIN = 1 as const;
const VALID_PIN_DURATIONS_SECONDS = [86400, 604800, 2592000];

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

export class PinService {
  private readonly logger = new Logger('PinService');

  constructor(private readonly waMonitor: WAMonitoringService) {}

  public async pinMessage({ instanceName }: InstanceDto, data: PinMessageDto) {
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

    if (!waInstance.client || typeof waInstance.client.sendMessage !== 'function') {
      throw new ServiceUnavailableException(`Baileys socket not ready for instance "${instanceName}"`);
    }

    if (data.type === PIN && !VALID_PIN_DURATIONS_SECONDS.includes(data.time as number)) {
      this.logger.warn(
        `pinMessage: time=${data.time} no es estándar de WhatsApp (24h=86400, 7d=604800, 30d=2592000). Baileys puede rechazarlo.`,
      );
    }

    const pinPayload = {
      pin: {
        type: data.type,
        key: data.key,
        time: data.type === PIN ? data.time : undefined,
      },
    } as unknown as AnyMessageContent;

    try {
      await waInstance.client.sendMessage(data.key.remoteJid, pinPayload);

      return {
        pinned: data.type === PIN,
        type: data.type,
        key: data.key,
        time: data.type === PIN ? data.time : null,
      };
    } catch (error) {
      this.logger.error({ local: 'PinService.pinMessage', error: error?.toString() });
      throw new BadGatewayException(`Baileys sendMessage(pin) failed: ${error?.message ?? error?.toString()}`);
    }
  }
}
