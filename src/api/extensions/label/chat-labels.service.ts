import { InstanceDto } from '@api/dto/instance.dto';
import { PrismaRepository } from '@api/repository/repository.service';
import { Logger } from '@config/logger.config';
import { NotFoundException } from '@exceptions';

import { GetChatLabelsResponse } from './chat-labels.dto';

export class ChatLabelsService {
  private readonly logger = new Logger('ChatLabelsService');

  constructor(private readonly prismaRepository: PrismaRepository) {}

  public async getChatLabels({ instanceName }: InstanceDto): Promise<GetChatLabelsResponse> {
    const instance = await this.prismaRepository.instance.findFirst({
      where: { name: instanceName },
      select: { id: true },
    });

    if (!instance) {
      throw new NotFoundException(`Instance "${instanceName}" not found`);
    }

    const rows = await this.prismaRepository.chat.findMany({
      where: {
        instanceId: instance.id,
        labels: { not: null as any },
      },
      select: { remoteJid: true, labels: true },
    });

    const chats = rows
      .filter((row) => Array.isArray(row.labels) && (row.labels as unknown[]).length > 0)
      .map((row) => ({
        chatId: row.remoteJid,
        labelIds: (row.labels as unknown[]).map((id) => String(id)),
      }));

    return { success: true, chats };
  }
}
