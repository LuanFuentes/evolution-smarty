/**
 * Capacidades de Baileys 7 que Evolution no expone (15-sep-2026):
 *
 *   POST /message/sendAlbum/{instance}       → varias fotos/videos en UNA burbuja (`album` + `albumParentKey`)
 *   POST /message/sendProduct/{instance}     → la ficha nativa de un producto del catálogo (`productMessage`)
 *   POST /chat/quickReply/{instance}         → crear/editar una respuesta rápida del WhatsApp Business del teléfono
 *   POST /chat/removeQuickReply/{instance}   → borrarla
 *   POST /business/productCreate/{instance}  → publicar un producto en el catálogo de la línea
 *   POST /business/productUpdate/{instance}  → editarlo
 *   POST /business/productDelete/{instance}  → sacarlo
 *
 * Las respuestas rápidas sólo van en un sentido (Smarty → teléfono): Baileys sabe escribirlas por app-state,
 * pero al recibir las del teléfono no emite nada. El catálogo se escribe con el mismo `productCreate` que
 * usa WhatsApp Web; las imágenes van por URL o base64.
 */
import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';
import { createJid } from '@utils/createJid';
import type { AnyMessageContent } from 'baileys';

import {
  ProductCreateDto,
  ProductDeleteDto,
  ProductUpdateDto,
  QuickReplyDto,
  RemoveQuickReplyDto,
  SendAlbumDto,
  SendProductDto,
} from './capacidades.dto';
import { comoMedio, comoProductoEnviable, elDuenoDelCatalogo, esperar, esVideo } from './capacidades.puro';

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

export class CapacidadesService {
  private readonly logger = new Logger('CapacidadesService');

  constructor(private readonly waMonitor: WAMonitoringService) {}

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
      this.logger.error({ local: `CapacidadesService.${metodo}`, error: error?.toString() });
      throw new BadGatewayException(`Baileys ${metodo} failed: ${error?.message ?? error?.toString()}`);
    }
  }

  /** El álbum: primero la burbuja (cuántas fotos y videos vienen), después cada medio colgado de ella. */
  public async sendAlbum({ instanceName }: InstanceDto, data: SendAlbumDto) {
    const jid = data.jid && data.jid.includes('@') ? data.jid : createJid(data.number as string);
    const videos = data.items.filter(esVideo).length;
    const fotos = data.items.length - videos;
    return this.conElSocket(instanceName, 'sendMessage', async (client) => {
      const album = await client.sendMessage(jid, {
        album: { expectedImageCount: fotos, expectedVideoCount: videos },
      } as AnyMessageContent);
      const hijos: unknown[] = [];
      for (const [i, item] of data.items.entries()) {
        const medio = comoMedio(item);
        const contenido = esVideo(item)
          ? { video: medio, caption: item.caption, mimetype: item.mimetype, albumParentKey: album.key }
          : { image: medio, caption: item.caption, mimetype: item.mimetype, albumParentKey: album.key };
        hijos.push((await client.sendMessage(jid, contenido as AnyMessageContent))?.key ?? null);
        if (i < data.items.length - 1 && data.delay) await esperar(data.delay);
      }
      return { key: album.key, items: hijos, fotos, videos };
    });
  }

  /** La ficha nativa de un producto: WhatsApp la pinta con foto, precio y «Ver», y el cliente la agrega al carrito. */
  public sendProduct({ instanceName }: InstanceDto, data: SendProductDto) {
    const jid = data.jid && data.jid.includes('@') ? data.jid : createJid(data.number as string);
    return this.conElSocket(instanceName, 'sendMessage', async (client) => {
      const businessOwnerJid = elDuenoDelCatalogo(data.businessOwnerJid, client.user?.id);
      const enviado = await client.sendMessage(jid, {
        product: comoProductoEnviable(data.product),
        businessOwnerJid,
        body: data.body,
        footer: data.footer,
      } as AnyMessageContent);
      return { key: enviado?.key ?? null, productId: data.product.productId, businessOwnerJid };
    });
  }

  public quickReply({ instanceName }: InstanceDto, data: QuickReplyDto) {
    const timestamp = data.timestamp ?? String(Math.floor(Date.now() / 1000));
    return this.conElSocket(instanceName, 'addOrEditQuickReply', async (client) => {
      await client.addOrEditQuickReply({
        shortcut: data.shortcut,
        message: data.message,
        keywords: data.keywords ?? [],
        count: 0,
        deleted: false,
        timestamp,
      });
      return { shortcut: data.shortcut, timestamp };
    });
  }

  public removeQuickReply({ instanceName }: InstanceDto, data: RemoveQuickReplyDto) {
    return this.conElSocket(instanceName, 'removeQuickReply', async (client) => {
      await client.removeQuickReply(data.timestamp);
      return { removed: data.timestamp };
    });
  }

  public productCreate({ instanceName }: InstanceDto, data: ProductCreateDto) {
    return this.conElSocket(instanceName, 'productCreate', (client) =>
      client.productCreate({
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency,
        retailerId: data.retailerId,
        url: data.url,
        isHidden: data.isHidden,
        originCountryCode: data.originCountryCode,
        images: data.images.map(comoMedio),
      }),
    );
  }

  public productUpdate({ instanceName }: InstanceDto, data: ProductUpdateDto) {
    return this.conElSocket(instanceName, 'productUpdate', (client) =>
      client.productUpdate(data.productId, {
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency,
        retailerId: data.retailerId,
        url: data.url,
        isHidden: data.isHidden,
        images: data.images.map(comoMedio),
      }),
    );
  }

  public productDelete({ instanceName }: InstanceDto, data: ProductDeleteDto) {
    return this.conElSocket(instanceName, 'productDelete', (client) => client.productDelete(data.productIds));
  }
}
