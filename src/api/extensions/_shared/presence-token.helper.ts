import { Logger } from '@config/logger.config';
import { BadRequestException } from '@exceptions';
import { isJidGroup, jidNormalizedUser } from 'baileys';

// Acepta @lid (privacy mode), @s.whatsapp.net (PN), @c.us (legacy)
export const JID_RE = /@(lid|s\.whatsapp\.net|c\.us)$/;

const logger = new Logger('PresenceTokenHelper');

export interface JidInput {
  jid?: string;
  number?: string;
}

export interface ResolvedJid {
  /** JID tal cual se resolvió (puede traer sufijo :device) */
  rawJid: string;
  /** jidNormalizedUser(rawJid) — mismo criterio con que Baileys keyea el tctoken */
  jid: string;
}

export interface TcTokenLookup {
  token: Buffer | undefined;
  matchedVariant: string | null;
  variantsProbed: string[];
}

/**
 * Resuelve el JID objetivo a partir de { jid?, number? }.
 * `jid` exacto tiene prioridad: whatsappNumber devuelve @s.whatsapp.net,
 * que es el JID equivocado para contactos en modo @lid.
 * Lanza BadRequestException si no hay forma válida de resolverlo.
 */
export async function resolveTargetJid(waInstance: any, data: JidInput): Promise<ResolvedJid> {
  let rawJid: string | undefined;

  if (data.jid && JID_RE.test(data.jid)) {
    rawJid = data.jid;
  } else if (data.number) {
    const isWA = (await waInstance.whatsappNumber({ numbers: [data.number] }))?.shift();
    const candidate = isWA?.jid;
    const acceptable = isWA?.exists || isJidGroup(candidate) || (candidate ? candidate.includes('@broadcast') : false);
    if (!candidate || !acceptable) {
      throw new BadRequestException(isWA ?? `Number "${data.number}" is not on WhatsApp`);
    }
    rawJid = candidate;
  } else {
    throw new BadRequestException('Debe enviar "jid" (preferido para @lid) o "number"');
  }

  return { rawJid, jid: jidNormalizedUser(rawJid) };
}

/**
 * Baileys guarda el tctoken bajo jidNormalizedUser(node.attrs.from)
 * (device strip-eado; c.us->s.whatsapp.net; lid se mantiene lid).
 * El privacy_token puede venir desde el @lid o desde el PN-jid según
 * cómo WhatsApp lo emita. Probamos variantes y reportamos cuál pegó
 * para distinguir mismatch (arreglable) de "WhatsApp no lo mandó".
 */
export async function resolveTcToken(client: any, rawJid: string): Promise<TcTokenLookup> {
  const variants: string[] = [];
  const pushVariant = (j?: string | null) => {
    if (j && JID_RE.test(j) && !variants.includes(j)) variants.push(j);
  };

  const normalized = jidNormalizedUser(rawJid);
  pushVariant(normalized);
  pushVariant(rawJid);

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
    logger.warn({ local: 'resolveTcToken.lidMapping', jid: rawJid, error: error?.toString() });
  }

  for (const variant of variants) {
    try {
      const tc = await client.authState.keys.get('tctoken', [variant]);
      const token = tc?.[variant]?.token;
      if (token) return { token, matchedVariant: variant, variantsProbed: variants };
    } catch (error) {
      logger.warn({ local: 'resolveTcToken.get', variant, error: error?.toString() });
    }
  }

  return { token: undefined, matchedVariant: null, variantsProbed: variants };
}
