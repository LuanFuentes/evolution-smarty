import { InstanceDto } from '@api/dto/instance.dto';

import {
  BusinessProfileDto,
  ProductCreateDto,
  ProductDeleteDto,
  ProductUpdateDto,
  QuickReplyDto,
  RemoveQuickReplyDto,
  SendAlbumDto,
  SendProductDto,
} from './capacidades.dto';
import { CapacidadesService } from './capacidades.service';

export class CapacidadesController {
  constructor(private readonly capacidadesService: CapacidadesService) {}

  public sendAlbum(instance: InstanceDto, data: SendAlbumDto) {
    return this.capacidadesService.sendAlbum(instance, data);
  }

  public sendProduct(instance: InstanceDto, data: SendProductDto) {
    return this.capacidadesService.sendProduct(instance, data);
  }

  public updateBusinessProfile(instance: InstanceDto, data: BusinessProfileDto) {
    return this.capacidadesService.updateBusinessProfile(instance, data);
  }

  public quickReply(instance: InstanceDto, data: QuickReplyDto) {
    return this.capacidadesService.quickReply(instance, data);
  }

  public removeQuickReply(instance: InstanceDto, data: RemoveQuickReplyDto) {
    return this.capacidadesService.removeQuickReply(instance, data);
  }

  public productCreate(instance: InstanceDto, data: ProductCreateDto) {
    return this.capacidadesService.productCreate(instance, data);
  }

  public productUpdate(instance: InstanceDto, data: ProductUpdateDto) {
    return this.capacidadesService.productUpdate(instance, data);
  }

  public productDelete(instance: InstanceDto, data: ProductDeleteDto) {
    return this.capacidadesService.productDelete(instance, data);
  }
}
