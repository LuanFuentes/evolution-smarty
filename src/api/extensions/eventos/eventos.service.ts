/**
 * Lo que acompaña a los eventos del fork (15-sep-2026): consultas bajo demanda de lo mismo que los
 * eventos traen solos. Sirven para el arranque (el cliente pregunta antes de que llegue el primer
 * evento) y para reparar (cruzar LIDs viejos con su teléfono).
 *
 *   GET  /chat/fetchNewChatMessageCap/{instance}  → el cupo de chats nuevos del ciclo (anti-spam de WhatsApp)
 *   GET  /chat/fetchBlocklist/{instance}          → los JIDs bloqueados desde el teléfono
 *   POST /chat/lidMapping/{instance}              → { jids } → pares LID ↔ teléfono que Baileys ya conoce
 *   POST /group/joinRequests/{instance}           → { groupJid } → solicitudes pendientes de entrar al grupo
 *   POST /group/updateJoinRequests/{instance}     → { groupJid, participants, action } → aprobar / rechazar
 */
import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';

import { GroupJoinRequestsDto, LidMappingDto, UpdateGroupJoinRequestsDto } from './eventos.dto';

const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;

class BadGatewayException {
  constructor(...objectError: any[]) {
    throw { status: BAD_GATEWAY, error: 'Bad Gateway', message: objectError.length > 0 ? objectError : undefined };
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

export interface ParLidTelefono {
  jid: string;
  lid: string | null;
  pn: string | null;
}

export class EventosService {
  private readonly logger = new Logger('EventosService');

  constructor(private readonly waMonitor: WAMonitoringService) {}

  /** La instancia Baileys abierta, o la excepción HTTP que corresponde. */
  private elSocket(instanceName: string): any {
    const waInstance = this.waMonitor.waInstances[instanceName];
    if (!waInstance) throw new NotFoundException(`Instance "${instanceName}" not found`);
    if (waInstance.integration !== Integration.WHATSAPP_BAILEYS) {
      throw new BadRequestException('Feature solo disponible en canales Baileys (no Cloud API)');
    }
    const state = waInstance.connectionStatus?.state;
    if (state !== 'open') {
      throw new ServiceUnavailableException(
        `Instance "${instanceName}" is not connected (state: ${state ?? 'unknown'})`,
      );
    }
    if (!waInstance.client)
      throw new ServiceUnavailableException(`Baileys socket not ready for instance "${instanceName}"`);
    return waInstance.client;
  }

  private async conElSocket<T>(instanceName: string, metodo: string, correr: (client: any) => Promise<T>): Promise<T> {
    const client = this.elSocket(instanceName);
    if (typeof client[metodo] !== 'function') {
      throw new ServiceUnavailableException(`Baileys ${metodo} no está disponible en esta versión`);
    }
    try {
      return await correr(client);
    } catch (error) {
      this.logger.error({ local: `EventosService.${metodo}`, error: error?.toString() });
      throw new BadGatewayException(`Baileys ${metodo} failed: ${error?.message ?? error?.toString()}`);
    }
  }

  public fetchNewChatMessageCap({ instanceName }: InstanceDto) {
    return this.conElSocket(instanceName, 'fetchNewChatMessageCap', (c) => c.fetchNewChatMessageCap());
  }

  public async fetchBlocklist({ instanceName }: InstanceDto): Promise<{ blocklist: string[] }> {
    const lista = await this.conElSocket<Array<string | undefined>>(instanceName, 'fetchBlocklist', (c) =>
      c.fetchBlocklist(),
    );
    return { blocklist: (lista ?? []).filter((j): j is string => typeof j === 'string' && j.length > 0) };
  }

  /** Cruza cada JID con lo que el signal repository ya sabe. No pregunta al servidor: es lo aprendido de mensajes e historial. */
  public async lidMapping({ instanceName }: InstanceDto, data: LidMappingDto): Promise<{ mappings: ParLidTelefono[] }> {
    const client = this.elSocket(instanceName);
    const store = client.signalRepository?.lidMapping;
    if (!store || typeof store.getPNForLID !== 'function' || typeof store.getLIDForPN !== 'function') {
      throw new ServiceUnavailableException('Baileys lidMapping no está disponible en esta versión');
    }
    const mappings: ParLidTelefono[] = [];
    for (const jid of data.jids) {
      try {
        if (jid.endsWith('@lid')) mappings.push({ jid, lid: jid, pn: (await store.getPNForLID(jid)) ?? null });
        else mappings.push({ jid, lid: (await store.getLIDForPN(jid)) ?? null, pn: jid });
      } catch (error) {
        this.logger.warn({ local: 'EventosService.lidMapping', jid, error: error?.toString() });
        mappings.push({ jid, lid: null, pn: null });
      }
    }
    return { mappings };
  }

  public groupJoinRequests({ instanceName }: InstanceDto, data: GroupJoinRequestsDto) {
    return this.conElSocket(instanceName, 'groupRequestParticipantsList', (c) =>
      c.groupRequestParticipantsList(data.groupJid),
    );
  }

  public updateGroupJoinRequests({ instanceName }: InstanceDto, data: UpdateGroupJoinRequestsDto) {
    return this.conElSocket(instanceName, 'groupRequestParticipantsUpdate', (c) =>
      c.groupRequestParticipantsUpdate(data.groupJid, data.participants, data.action),
    );
  }
}
