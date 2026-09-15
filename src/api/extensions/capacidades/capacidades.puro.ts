/**
 * Lo puro de las capacidades, sin importar Baileys ni el monitor: para probarlo con node --test.
 */
import type { WAMediaUpload } from 'baileys';

import { MedioDto } from './capacidades.dto';

/** Un medio del DTO a lo que Baileys sube: URL tal cual o el base64 como Buffer. */
export function comoMedio(m: MedioDto): WAMediaUpload {
  if (m.base64) return Buffer.from(m.base64.replace(/^data:[^;]+;base64,/, ''), 'base64');
  return { url: m.url as string };
}

/** Video si el mimetype o la extensión lo dicen; si no, imagen. */
export function esVideo(m: MedioDto): boolean {
  if (m.mimetype) return m.mimetype.startsWith('video/');
  return /\.(mp4|mov|webm|3gp|mkv)(\?|$)/i.test(m.url ?? '');
}

export const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
