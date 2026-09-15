/**
 * Usernames (F2 del plan Evolution/Baileys de Smarty, 15-sep-2026).
 *
 * WhatsApp está sacando los @usuarios: un contacto puede escribir sin que se vea su número, y para
 * mandarle hay que resolver el @usuario a su LID. Baileys lo soporta desde 7.0.0-rc10 (USync con
 * `withUsername` + los protocolos contact/lid/username); este servicio lo expone como endpoint,
 * igual que `whatsappNumbers` resuelve un número.
 *
 * El username que llega en cada MENSAJE ya viaja solo: `prepareMessage` copia `key` tal cual de
 * Baileys, y rc14 pone `key.remoteJidUsername` / `key.participantUsername`. El de cada CONTACTO
 * (`contacts.upsert` / `contacts.update`) lo agrega el canal Baileys al payload del webhook
 * (campo aditivo `username`, sin tocar el esquema Prisma).
 */
import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';
import { USyncQuery, USyncUser } from 'baileys';

import { ResolveUsernameDto } from './usernames.dto';

const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;

class BadGatewayException {
  constructor(...objectError: any[]) {
    throw { status: BAD_GATEWAY, error: 'Bad Gateway', message: objectError.length > 0 ? objectError : undefined };
  }
}

class ServiceUnavailableException {
  constructor(...objectError: any[]) {
    throw { status: SERVICE_UNAVAILABLE, error: 'Service Unavailable', message: objectError.length > 0 ? objectError : undefined };
  }
}

export interface UsernameResuelto {
  username: string;
  exists: boolean;
  /** El JID con el que se le manda: el LID si lo hay (privacidad), si no el de teléfono. */
  jid: string | null;
  lid: string | null;
  /** El JID de teléfono si WhatsApp lo devolvió (con privacidad activa no viene). */
  phoneJid: string | null;
}

/** «@luan.fuentes» → «luan.fuentes». */
export const usernameLimpio = (u: string): string => u.trim().replace(/^@+/, '').toLowerCase();

/** Lo que devuelve el USync, a la forma del endpoint. Puro, para probarlo. */
export function leerResultadoDelUSync(username: string, result: { list?: Array<Record<string, unknown>> } | undefined): UsernameResuelto {
  const fila = result?.list?.[0];
  if (!fila) return { username, exists: false, jid: null, lid: null, phoneJid: null };
  const id = typeof fila.id === 'string' ? fila.id : null;
  const lidDelProtocolo = typeof fila.lid === 'string' ? fila.lid : null;
  const esLid = (j: string | null) => Boolean(j && j.endsWith('@lid'));
  const lid = esLid(id) ? id : lidDelProtocolo;
  const phoneJid = id && !esLid(id) ? id : null;
  const exists = fila.contact === true || Boolean(lid) || Boolean(phoneJid);
  return { username: typeof fila.username === 'string' && fila.username ? fila.username : username, exists, jid: lid ?? phoneJid, lid, phoneJid };
}

export class UsernamesService {
  private readonly logger = new Logger('UsernamesService');

  constructor(private readonly waMonitor: WAMonitoringService) {}

  public async resolveUsername({ instanceName }: InstanceDto, data: ResolveUsernameDto): Promise<UsernameResuelto> {
    const waInstance = this.waMonitor.waInstances[instanceName];
    if (!waInstance) throw new NotFoundException(`Instance "${instanceName}" not found`);
    if (waInstance.integration !== Integration.WHATSAPP_BAILEYS) {
      throw new BadRequestException('Feature solo disponible en canales Baileys (Cloud API usa BSUID)');
    }
    const state = waInstance.connectionStatus?.state;
    if (state !== 'open') throw new ServiceUnavailableException(`Instance "${instanceName}" is not connected (state: ${state ?? 'unknown'})`);
    const client = waInstance.client as { executeUSyncQuery?: (q: USyncQuery) => Promise<{ list?: Array<Record<string, unknown>> } | undefined> } | undefined;
    if (!client || typeof client.executeUSyncQuery !== 'function') {
      throw new ServiceUnavailableException(`Baileys socket not ready for instance "${instanceName}"`);
    }

    const username = usernameLimpio(data.username);
    const user = new USyncUser().withUsername(username);
    if (data.usernameKey) user.withUsernameKey(data.usernameKey.trim());
    const query = new USyncQuery().withContactProtocol().withLIDProtocol().withUsernameProtocol().withUser(user);

    try {
      const result = await client.executeUSyncQuery(query);
      const resuelto = leerResultadoDelUSync(username, result);
      this.logger.info(`resolveUsername: @${username} → ${resuelto.exists ? resuelto.jid : 'no existe'}`);
      return resuelto;
    } catch (error) {
      this.logger.error({ local: 'UsernamesService.resolveUsername', error: error?.toString() });
      throw new BadGatewayException(`Baileys executeUSyncQuery(username) failed: ${error?.message ?? error?.toString()}`);
    }
  }
}
