import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';

import { OrderDetailsDto } from './business.dto';
import { elIqDelPedido, elPedidoDelNodo } from './pedido.puro';

const BAD_GATEWAY = 502;
const SERVICE_UNAVAILABLE = 503;

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

export class BusinessService {
  private readonly logger = new Logger('BusinessService');

  constructor(private readonly waMonitor: WAMonitoringService) {}

  public async getOrderDetails({ instanceName }: InstanceDto, data: OrderDetailsDto) {
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
