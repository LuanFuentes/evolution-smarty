import { InstanceDto } from '@api/dto/instance.dto';
import { resolveTargetJid, resolveTcToken } from '@api/extensions/_shared/presence-token.helper';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';

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

    const { rawJid, jid } = await resolveTargetJid(waInstance, data);

    const { token: tcToken, matchedVariant, variantsProbed } = await resolveTcToken(waInstance.client, rawJid);

    try {
      // Suscribir con el jid normalizado (mismo criterio con que Baileys
      // keyea el tctoken; evita el mismatch por sufijo :device).
      await waInstance.client.presenceSubscribe(jid, tcToken);
      return {
        ok: true,
        jid,
        rawJid,
        hadTcToken: !!tcToken,
        tcTokenMatchedVariant: matchedVariant,
        variantsProbed,
      };
    } catch (error) {
      this.logger.error({ local: 'PresenceSubscribeService.presenceSubscribe', error: error?.toString() });
      throw new BadGatewayException(`Baileys presenceSubscribe failed: ${error?.message ?? error?.toString()}`);
    }
  }
}
