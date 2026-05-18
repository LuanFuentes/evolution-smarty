import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';
import { isJidGroup, jidNormalizedUser } from 'baileys';

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

  /**
   * Baileys guarda el tctoken bajo jidNormalizedUser(node.attrs.from)
   * (device strip-eado; c.us->s.whatsapp.net; lid se mantiene lid).
   * El privacy_token puede venir desde el @lid o desde el PN-jid según
   * cómo WhatsApp lo emita. Probamos variantes y reportamos cuál pegó
   * para distinguir mismatch (arreglable) de "WhatsApp no lo mandó".
   */
  private async resolveTcToken(
    client: any,
    jid: string,
  ): Promise<{ token: Buffer | undefined; matchedVariant: string | null; variantsProbed: string[] }> {
    const variants: string[] = [];
    const pushVariant = (j?: string | null) => {
      if (j && JID_RE.test(j) && !variants.includes(j)) variants.push(j);
    };

    const normalized = jidNormalizedUser(jid);
    pushVariant(normalized);
    pushVariant(jid);

    // lid <-> pn cross-lookup via Baileys lidMapping
    try {
      if (normalized.endsWith('@lid')) {
        const pn = await client.signalRepository?.lidMapping?.getPNForLID?.(normalized);
        pushVariant(pn ? jidNormalizedUser(pn) : null);
      } else if (normalized.endsWith('@s.whatsapp.net')) {
        const lid = await client.signalRepository?.lidMapping?.getLIDForPN?.(normalized);
        pushVariant(lid ? jidNormalizedUser(lid) : null);
      }
    } catch (error) {
      this.logger.warn({ local: 'resolveTcToken.lidMapping', jid, error: error?.toString() });
    }

    for (const variant of variants) {
      try {
        const tc = await client.authState.keys.get('tctoken', [variant]);
        const token = tc?.[variant]?.token;
        if (token) return { token, matchedVariant: variant, variantsProbed: variants };
      } catch (error) {
        this.logger.warn({ local: 'resolveTcToken.get', variant, error: error?.toString() });
      }
    }

    return { token: undefined, matchedVariant: null, variantsProbed: variants };
  }

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
    let rawJid: string | undefined;
    if (data.jid && JID_RE.test(data.jid)) {
      rawJid = data.jid;
    } else if (data.number) {
      const isWA = (await waInstance.whatsappNumber({ numbers: [data.number] }))?.shift();
      const candidate = isWA?.jid;
      const acceptable =
        isWA?.exists || isJidGroup(candidate) || (candidate ? candidate.includes('@broadcast') : false);
      if (!candidate || !acceptable) {
        throw new BadRequestException(isWA ?? `Number "${data.number}" is not on WhatsApp`);
      }
      rawJid = candidate;
    } else {
      throw new BadRequestException('Debe enviar "jid" (preferido para @lid) o "number"');
    }

    // Suscribir con el jid normalizado (mismo criterio con que Baileys
    // keyea el tctoken; evita el mismatch por sufijo :device).
    const jid = jidNormalizedUser(rawJid);

    const { token: tcToken, matchedVariant, variantsProbed } = await this.resolveTcToken(waInstance.client, rawJid);

    try {
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
