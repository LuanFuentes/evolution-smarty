import { InstanceDto } from '@api/dto/instance.dto';

import { FindCatalogParams, FindCollectionsParams } from './catalog.dto';
import { CatalogService } from './catalog.service';

export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  public async findCatalog(instance: InstanceDto, params: FindCatalogParams) {
    return this.catalogService.findCatalog(instance, params);
  }

  public async findCollections(instance: InstanceDto, params: FindCollectionsParams) {
    return this.catalogService.findCollections(instance, params);
  }
}
