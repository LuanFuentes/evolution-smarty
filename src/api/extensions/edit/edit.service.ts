import { InstanceDto } from '@api/dto/instance.dto';
import { WAMonitoringService } from '@api/services/monitor.service';
import { Integration } from '@api/types/wa.types';
import { Logger } from '@config/logger.config';
import { BadRequestException, NotFoundException } from '@exceptions';
import { AnyMessageContent } from 'baileys';

import { EditMessageDto } from './edit.dto';

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

export class EditService {
  private readonly logger = new Logger('EditService');

  constructor(private readonly waMonitor: WAMonitoringService) {}

  public async editMessage({ instanceName }: InstanceDto, data: EditMessageDto) {
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

    if (!waInstance.client || typeof waInstance.client.sendMessage !== 'function') {
      throw new ServiceUnavailableException(`Baileys socket not ready for instance "${instanceName}"`);
    }

    if (data.key.fromMe !== true) {
      throw new BadRequestException('Solo se pueden editar mensajes propios (key.fromMe debe ser true)');
    }

    const editPayload = {
      text: data.text,
      edit: data.key,
    } as unknown as AnyMessageContent;

    try {
      await waInstance.client.sendMessage(data.key.remoteJid, editPayload);

      return {
        edited: true,
        key: data.key,
        newText: data.text,
      };
    } catch (error) {
      this.logger.error({ local: 'EditService.editMessage', error: error?.toString() });
      throw new BadGatewayException(`Baileys sendMessage(edit) failed: ${error?.message ?? error?.toString()}`);
    }
  }
}
