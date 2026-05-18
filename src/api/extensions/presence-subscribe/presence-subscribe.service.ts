import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';
import { isJidGroup } from 'baileys';

import { PresenceSubscribeDto } from './presence-subscribe.dto';

const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;

// Acepta @lid (privacy mode), @s.whatsapp.net (PN), @c.us (legacy)
const JID_RE = /@(lid|s\.whatsapp\.net|c\.us)$/;

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

    // jid exacto tiene prioridad (whatsappNumber devuelve @s.whatsapp.net,
    // JID equivocado para contactos en modo @lid).
    let jid: string | undefined;
    if (data.jid && JID_RE.test(data.jid)) {
      jid = data.jid;
    } else if (data.number) {
      const isWA = (await waInstance.whatsappNumber({ numbers: [data.number] }))?.shift();
      const candidate = isWA?.jid;
      const acceptable =
        isWA?.exists || isJidGroup(candidate) || (candidate ? candidate.includes('@broadcast') : false);
      if (!candidate || !acceptable) {
        throw new BadRequestException(isWA ?? `Number "${data.number}" is not on WhatsApp`);
      }
      jid = candidate;
    } else {
      throw new BadRequestException('Debe enviar "jid" (preferido para @lid) o "number"');
    }

    // tcToken: WhatsApp lo EXIGE en el subscribe para devolver
    // unavailable/lastSeen en privacy mode @lid. Sin él solo llega
    // composing/available (nivel conversación). Se captura de mensajes
    // entrantes y vive en el keystore de Baileys (mismo patrón que
    // messages-send.js usa al enviar).
    let tcToken: Buffer | undefined;
    try {
      const tc = await waInstance.client.authState.keys.get('tctoken', [jid]);
      tcToken = tc?.[jid]?.token;
    } catch (error) {
      this.logger.warn({ local: 'PresenceSubscribeService.tctoken', jid, error: error?.toString() });
    }

    try {
      await waInstance.client.presenceSubscribe(jid, tcToken);
      return { ok: true, jid, hadTcToken: !!tcToken };
    } catch (error) {
      this.logger.error({ local: 'PresenceSubscribeService.presenceSubscribe', error: error?.toString() });
      throw new BadGatewayException(`Baileys presenceSubscribe failed: ${error?.message ?? error?.toString()}`);
    }
  }
}
