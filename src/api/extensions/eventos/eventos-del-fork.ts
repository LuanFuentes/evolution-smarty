/**
 * Los eventos de Baileys que el core de Evolution escucha pero NO reenvía al webhook (15-sep-2026).
 *
 * Baileys 7 (rc14) emite `lid-mapping.update`, `message-capping.update`, `messages.reaction`,
 * `message-receipt.update`, `blocklist.set/update`, `group.join-request` y `chats.lock`; el core los
 * ignora o los consume por dentro (el recibo de lectura sólo sirve para marcar leídos en su base).
 * Acá se convierten en eventos de webhook con el mismo molde que los del core: el nombre de
 * suscripción sale del valor (`lid-mapping.update` → `LID_MAPPING_UPDATE`), así el cliente los
 * activa en `webhook.events` como a cualquier otro.
 *
 * Es capa paralela: el core sólo llama `procesarEventosDelFork(this, events)` una vez por lote,
 * ANTES de sus propios handlers (algunos hacen `return` y cortarían el lote).
 */
import { Events } from '@api/types/wa.types';
import type { BaileysEventMap } from 'baileys';

type LoteDeEventos = Partial<BaileysEventMap>;

interface InstanciaQueEmite {
  sendDataWebhook<T extends object = any>(event: Events, data: T): Promise<void>;
  logger: { warn: (msg: any) => void };
}

/** Nombres de suscripción (los que van en `webhook.events`), para registrarlos en las listas del core. */
export const EVENTOS_DEL_FORK = [
  'LID_MAPPING_UPDATE',
  'MESSAGE_CAPPING_UPDATE',
  'MESSAGES_REACTION',
  'MESSAGE_RECEIPT_UPDATE',
  'BLOCKLIST_SET',
  'BLOCKLIST_UPDATE',
  'GROUP_JOIN_REQUEST',
  'CHATS_LOCK',
  'CHATS_ARCHIVE',
] as const;

/** Reenvía al webhook los eventos que el core no manda. Nunca tira: un fallo acá no puede frenar el lote del core. */
export async function procesarEventosDelFork(instancia: InstanciaQueEmite, events: LoteDeEventos): Promise<void> {
  const mandar = async (event: Events, data: object | undefined) => {
    if (data === undefined || data === null) return;
    try {
      await instancia.sendDataWebhook(event, data);
    } catch (error) {
      instancia.logger.warn({ local: 'eventosDelFork', event, error: error?.toString() });
    }
  };

  // LID ↔ teléfono: el par suelto (un contacto nuevo) y la tanda que viene con el historial al conectar.
  const mapeos: Array<{ lid: string; pn: string }> = [];
  if (events['lid-mapping.update']) mapeos.push(events['lid-mapping.update']);
  const delHistorial = events['messaging-history.set']?.lidPnMappings;
  if (Array.isArray(delHistorial)) mapeos.push(...delHistorial);
  if (mapeos.length > 0) await mandar(Events.LID_MAPPING_UPDATE, mapeos);

  await mandar(Events.MESSAGE_CAPPING_UPDATE, events['message-capping.update']);
  await mandar(Events.MESSAGES_REACTION, events['messages.reaction']);
  await mandar(Events.MESSAGE_RECEIPT_UPDATE, events['message-receipt.update']);
  await mandar(Events.BLOCKLIST_SET, events['blocklist.set']);
  await mandar(Events.BLOCKLIST_UPDATE, events['blocklist.update']);
  await mandar(Events.GROUP_JOIN_REQUEST, events['group.join-request']);
  await mandar(Events.CHATS_LOCK, events['chats.lock']);

  // Archivar / desarchivar desde el celular llega como chats.update { id, archived }; el core reenvía ese evento
  // sólo con el remoteJid, así que acá sale con su nombre propio y el campo que importa.
  const archivados = (events['chats.update'] ?? [])
    .filter((c) => typeof c?.archived === 'boolean' && typeof c?.id === 'string')
    .map((c) => ({ id: c.id as string, archived: c.archived as boolean }));
  if (archivados.length > 0) await mandar(Events.CHATS_ARCHIVE, archivados);
}
