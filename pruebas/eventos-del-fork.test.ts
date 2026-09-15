// Correr: npx tsx --test pruebas/eventos-del-fork.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Events } from '@api/types/wa.types';

import { EVENTOS_DEL_FORK, procesarEventosDelFork } from '@api/extensions/eventos/eventos-del-fork';

function instanciaFalsa() {
  const mandados: Array<{ event: string; data: unknown }> = [];
  return {
    mandados,
    async sendDataWebhook(event: Events, data: unknown) {
      mandados.push({ event, data });
    },
    logger: { warn: () => undefined },
  };
}

test('el nombre de suscripción de cada evento del fork sale del valor del enum', () => {
  const nombres = Object.values(Events).map((v) => v.replace(/[.-]/g, '_').toUpperCase());
  for (const e of EVENTOS_DEL_FORK) assert.ok(nombres.includes(e), `${e} no tiene valor en Events`);
});

test('un lote sin eventos del fork no manda nada', async () => {
  const i = instanciaFalsa();
  await procesarEventosDelFork(i, { 'messages.upsert': { messages: [], type: 'notify' } });
  assert.equal(i.mandados.length, 0);
});

test('el mapeo suelto y la tanda del historial salen juntos como LID_MAPPING_UPDATE', async () => {
  const i = instanciaFalsa();
  await procesarEventosDelFork(i, {
    'lid-mapping.update': { lid: '1@lid', pn: '51900000001@s.whatsapp.net' },
    'messaging-history.set': {
      chats: [],
      contacts: [],
      messages: [],
      lidPnMappings: [{ lid: '2@lid', pn: '51900000002@s.whatsapp.net' }],
    },
  } as any);
  assert.equal(i.mandados.length, 1);
  assert.equal(i.mandados[0].event, Events.LID_MAPPING_UPDATE);
  assert.deepEqual(i.mandados[0].data, [
    { lid: '1@lid', pn: '51900000001@s.whatsapp.net' },
    { lid: '2@lid', pn: '51900000002@s.whatsapp.net' },
  ]);
});

test('cada evento nuevo viaja con su nombre y su payload tal cual', async () => {
  const i = instanciaFalsa();
  const lote = {
    'message-capping.update': { total_quota: 250, used_quota: 37 },
    'messages.reaction': [{ key: { id: 'A' }, reaction: { text: '👍' } }],
    'message-receipt.update': [{ key: { id: 'B' }, receipt: { userJid: '3@lid', readTimestamp: 1 } }],
    'blocklist.set': { blocklist: ['4@s.whatsapp.net'] },
    'blocklist.update': { blocklist: ['5@lid'], type: 'add' },
    'group.join-request': {
      id: 'g@g.us',
      author: 'a@lid',
      participant: 'p@lid',
      action: 'created',
      method: 'invite_link',
    },
    'chats.lock': { id: 'c@s.whatsapp.net', locked: true },
  };
  await procesarEventosDelFork(i, lote as any);
  const porEvento = Object.fromEntries(i.mandados.map((m) => [m.event, m.data]));
  assert.deepEqual(porEvento[Events.MESSAGE_CAPPING_UPDATE], lote['message-capping.update']);
  assert.deepEqual(porEvento[Events.MESSAGES_REACTION], lote['messages.reaction']);
  assert.deepEqual(porEvento[Events.MESSAGE_RECEIPT_UPDATE], lote['message-receipt.update']);
  assert.deepEqual(porEvento[Events.BLOCKLIST_SET], lote['blocklist.set']);
  assert.deepEqual(porEvento[Events.BLOCKLIST_UPDATE], lote['blocklist.update']);
  assert.deepEqual(porEvento[Events.GROUP_JOIN_REQUEST], lote['group.join-request']);
  assert.deepEqual(porEvento[Events.CHATS_LOCK], lote['chats.lock']);
  assert.equal(i.mandados.length, 7);
});

test('un webhook que falla no frena el lote ni tira', async () => {
  const avisos: unknown[] = [];
  const i = {
    async sendDataWebhook() {
      throw new Error('caído');
    },
    logger: { warn: (m: unknown) => avisos.push(m) },
  };
  await procesarEventosDelFork(i, {
    'chats.lock': { id: 'c', locked: false },
    'blocklist.set': { blocklist: [] },
  } as any);
  assert.equal(avisos.length, 2);
});
