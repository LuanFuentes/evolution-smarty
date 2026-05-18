import { InstanceDto } from '@api/dto/instance.dto';
import { resolveTargetJid, resolveTcToken } from '@api/extensions/_shared/presence-token.helper';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';

import { DebugPrivacyTokensDto } from './privacy-tokens.dto';

const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;

// Poll acotado: en vez de un sleep fijo (code smell), reintenta corto y
// sale apenas aparece el token. Máx ~1.8s, early-exit.
const POLL_TRIES = 6;
const POLL_INTERVAL_MS = 300;

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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Serializa un BinaryNode de Baileys a JSON seguro: Buffers -> base64,
 * profundidad acotada, sin estructuras circulares. Solo para diagnóstico.
 */
function safeNode(node: any, depth = 0): any {
  if (depth > 6 || node === null || node === undefined) return node ?? null;
  if (Buffer.isBuffer(node)) return { __buffer_b64: node.toString('base64'), length: node.length };
  if (Array.isArray(node)) return node.slice(0, 50).map((n) => safeNode(n, depth + 1));
  if (typeof node === 'object') {
    const out: Record<string, any> = {};
    for (const k of Object.keys(node).slice(0, 50)) out[k] = safeNode(node[k], depth + 1);
    return out;
  }
  return node;
}

/** ¿El IQ result trae algún <token> con contenido (caso A)? */
function iqResultHasTokenNode(node: any, depth = 0): boolean {
  if (depth > 6 || !node || typeof node !== 'object') return false;
  if (node.tag === 'token' && (Buffer.isBuffer(node.content) || (node.content && node.content.length))) return true;
  const children = Array.isArray(node) ? node : Array.isArray(node.content) ? node.content : [];
  return children.some((c: any) => iqResultHasTokenNode(c, depth + 1));
}

export class PrivacyTokensService {
  private readonly logger = new Logger('PrivacyTokensService');

  constructor(private readonly waMonitor: WAMonitoringService) {}

  /**
   * Endpoint DIAGNÓSTICO. Determina si getPrivacyTokens es vía válida
   * para recuperar el tctoken de contactos donde WhatsApp no lo empujó:
   *  - verdict 'already_had'  : el contacto ya tenía token (no aplica)
   *  - verdict 'B_keystore'   : tras pedirlo, apareció en el keystore
   *                             (WhatsApp lo empujó por notification) → FIX
   *  - verdict 'A_iq_result'  : el token vino en la respuesta del IQ
   *                             (hay que parsear/guardar manualmente)
   *  - verdict 'none'         : ni así aparece (límite real del contacto)
   */
  public async debugPrivacyTokens({ instanceName }: InstanceDto, data: DebugPrivacyTokensDto) {
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

    if (!waInstance.client || typeof waInstance.client.getPrivacyTokens !== 'function') {
      throw new ServiceUnavailableException(`Baileys getPrivacyTokens not available for "${instanceName}"`);
    }

    const { rawJid, jid } = await resolveTargetJid(waInstance, data);

    const before = await resolveTcToken(waInstance.client, rawJid);

    let iqResultSafe: any = null;
    let iqResultHasToken = false;
    let getPrivacyTokensError: string | null = null;

    try {
      const result = await waInstance.client.getPrivacyTokens([jid]);
      iqResultSafe = safeNode(result);
      iqResultHasToken = iqResultHasTokenNode(result);
    } catch (error: any) {
      getPrivacyTokensError = error?.message ?? error?.toString() ?? 'unknown';
      this.logger.error({ local: 'PrivacyTokensService.getPrivacyTokens', error: getPrivacyTokensError });
      throw new BadGatewayException(`Baileys getPrivacyTokens failed: ${getPrivacyTokensError}`);
    }

    // Poll acotado: si WhatsApp empuja el token por notification, el
    // handler de Baileys lo guarda en el keystore en algún momento corto.
    let after = await resolveTcToken(waInstance.client, rawJid);
    for (let i = 0; i < POLL_TRIES && !after.token; i++) {
      await delay(POLL_INTERVAL_MS);
      after = await resolveTcToken(waInstance.client, rawJid);
    }

    let verdict: 'already_had' | 'B_keystore' | 'A_iq_result' | 'none';
    if (before.token) verdict = 'already_had';
    else if (after.token) verdict = 'B_keystore';
    else if (iqResultHasToken) verdict = 'A_iq_result';
    else verdict = 'none';

    return {
      ok: true,
      jid,
      rawJid,
      verdict,
      before: { hadTcToken: !!before.token, matchedVariant: before.matchedVariant },
      after: {
        hadTcToken: !!after.token,
        matchedVariant: after.matchedVariant,
        variantsProbed: after.variantsProbed,
      },
      iqResultHasTokenNode: iqResultHasToken,
      getPrivacyTokensResult: iqResultSafe,
    };
  }
}
