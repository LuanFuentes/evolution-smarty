import { InstanceDto } from '@api/dto/instance.dto';

import { OrderDetailsDto } from './business.dto';
import { BusinessService } from './business.service';

export class BusinessExtController {
  constructor(private readonly businessService: BusinessService) {}

  public async getOrderDetails(instance: InstanceDto, data: OrderDetailsDto) {
    return this.businessService.getOrderDetails(instance, data);
  }
}
