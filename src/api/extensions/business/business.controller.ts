import { InstanceDto } from '@api/dto/instance.dto';

import { CatalogoDto, OrderDetailsDto, ProductosABorrarDto } from './business.dto';
import { BusinessService } from './business.service';

export class BusinessExtController {
  constructor(private readonly businessService: BusinessService) {}

  public async getOrderDetails(instance: InstanceDto, data: OrderDetailsDto) {
    return this.businessService.getOrderDetails(instance, data);
  }

  public async getCatalog(instance: InstanceDto, data: CatalogoDto) {
    return this.businessService.getCatalog(instance, data);
  }

  public async productDelete(instance: InstanceDto, data: ProductosABorrarDto) {
    return this.businessService.productDelete(instance, data);
  }
}
