import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';
import { isJidGroup } from 'baileys';

import { PresenceSubscribeDto } from './presence-subscribe.dto';

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

export class PresenceSubscribeService {
  private readonly logger = new Logger('PresenceSubscribeService');

  constructor(private readonly waMonitor: WAMonitoringService) {}

  public async presenceSubscribe({ instanceName }: InstanceDto, data: PresenceSubscribeDto) {
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

    if (!waInstance.client || typeof waInstance.client.presenceSubscribe !== 'function') {
      throw new ServiceUnavailableException(`Baileys socket not ready for instance "${instanceName}"`);
    }

    // Resolve number -> JID with the same path sendPresence uses (respeta @lid / @s.whatsapp.net / grupos / broadcast)
    const isWA = (await waInstance.whatsappNumber({ numbers: [data.number] }))?.shift();

    const jid = isWA?.jid;
    const acceptable = isWA?.exists || isJidGroup(jid) || (jid ? jid.includes('@broadcast') : false);

    if (!jid || !acceptable) {
      throw new BadRequestException(isWA ?? `Number "${data.number}" is not on WhatsApp`);
    }

    try {
      // ONLY subscribe — sin sendPresenceUpdate (nada de composing/paused).
      await waInstance.client.presenceSubscribe(jid);
      return { ok: true, jid };
    } catch (error) {
      this.logger.error({ local: 'PresenceSubscribeService.presenceSubscribe', error: error?.toString() });
      throw new BadGatewayException(`Baileys presenceSubscribe failed: ${error?.message ?? error?.toString()}`);
    }
  }
}
