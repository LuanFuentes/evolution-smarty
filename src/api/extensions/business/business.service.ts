import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';

import { createJid } from '@utils/createJid';

import { CatalogoDto, OrderDetailsDto, ProductosABorrarDto } from './business.dto';
import type { ProductoDelCatalogo } from './catalogo.puro';
import { elCatalogoDelNodo, elIqDeBorrarProductos, elIqDelCatalogo, elJidSinDispositivo, losBorradosDelNodo } from './catalogo.puro';
import { elIqDelPedido, elPedidoDelNodo } from './pedido.puro';

const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;
const GATEWAY_TIMEOUT = 504;

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

/**
 * 🚨 WhatsApp no contestó (Baileys #2717): la familia `w:biz:catalog` expira a los 60 s y rc14 devuelve `undefined`
 * en vez de tirar. Acá eso es un 504 con nombre, nunca «0 productos».
 */
class GatewayTimeoutException {
  constructor(...objectError: any[]) {
    throw {
      status: GATEWAY_TIMEOUT,
      error: 'Gateway Timeout',
      message: objectError.length > 0 ? objectError : undefined,
    };
  }
}

const NO_CONTESTO = 'WhatsApp no contestó la consulta del catálogo (w:biz:catalog expira a los 60 s; Baileys #2717)';

export class BusinessService {
  private readonly logger = new Logger('BusinessService');

  constructor(private readonly waMonitor: WAMonitoringService) {}

  /** El socket de Baileys de la instancia, listo para `query`; o la excepción que corresponde. */
  private elSocket(instanceName: string): any {
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

    if (!waInstance.client || typeof waInstance.client.query !== 'function') {
      throw new ServiceUnavailableException(`Baileys socket not ready for instance "${instanceName}"`);
    }
    return waInstance.client;
  }

  /**
   * El catálogo de la línea (o de un número), leído con el IQ de Baileys por `client.query` para VER el timeout.
   * Misma forma de respuesta que el `getCatalog` de upstream (`wuid, numberExists, isBusiness, catalogLength, catalog`),
   * más `retailerId` por producto. Pisa la ruta de upstream: el router de extensiones va antes.
   */
  public async getCatalog({ instanceName }: InstanceDto, data: CatalogoDto) {
    const client = this.elSocket(instanceName);
    const jid = data.number ? createJid(data.number) : elJidSinDispositivo(String(client.user?.id ?? ''));
    const limit = Math.min(Math.max(Number(data.limit) || 10, 1), 100);

    let isBusiness = false;
    try {
      isBusiness = Boolean(await client.getBusinessProfile(jid));
    } catch (error) {
      this.logger.warn({ local: 'BusinessService.getCatalog', error: `perfil de negocio: ${error?.toString()}` });
    }

    const catalog: ProductoDelCatalogo[] = [];
    let cursor: string | null = null;
    for (let pagina = 0; pagina < 5; pagina++) {
      let nodo: unknown;
      try {
        nodo = await client.query(elIqDelCatalogo(jid, limit, cursor));
      } catch (error) {
        this.logger.error({ local: 'BusinessService.getCatalog', error: error?.toString() });
        throw new BadGatewayException(`Baileys getCatalog failed: ${error?.message ?? error?.toString()}`);
      }
      if (nodo === undefined || nodo === null) throw new GatewayTimeoutException(NO_CONTESTO);
      const leida = elCatalogoDelNodo(nodo as any);
      catalog.push(...leida.products);
      cursor = leida.nextPageCursor;
      if (!cursor || leida.products.length < limit) break;
    }

    return { wuid: jid, numberExists: true, isBusiness, catalogLength: catalog.length, catalog };
  }

  /** Borrar productos del catálogo de la línea, con el timeout a la vista (el de upstream devolvía `deleted: 0`). */
  public async productDelete({ instanceName }: InstanceDto, data: ProductosABorrarDto) {
    const client = this.elSocket(instanceName);
    let nodo: unknown;
    try {
      nodo = await client.query(elIqDeBorrarProductos(data.productIds));
    } catch (error) {
      this.logger.error({ local: 'BusinessService.productDelete', error: error?.toString() });
      throw new BadGatewayException(`Baileys productDelete failed: ${error?.message ?? error?.toString()}`);
    }
    if (nodo === undefined || nodo === null) throw new GatewayTimeoutException(NO_CONTESTO);
    return { deleted: losBorradosDelNodo(nodo as any) };
  }

  public async getOrderDetails({ instanceName }: InstanceDto, data: OrderDetailsDto) {
    const waInstance = { client: this.elSocket(instanceName) };

    try {
      // El mismo IQ de Baileys `getOrderDetails`, leído entero: su parser se come `retailer_id` (ver pedido.puro.ts).
      const nodo = await waInstance.client.query(elIqDelPedido(data.orderId, data.tokenBase64));
      const pedido = elPedidoDelNodo(nodo);

      return { price: pedido.price, products: pedido.products };
    } catch (error) {
      this.logger.error({ local: 'BusinessService.getOrderDetails', error: error?.toString() });
      throw new BadGatewayException(`Baileys getOrderDetails failed: ${error?.message ?? error?.toString()}`);
    }
  }
}
