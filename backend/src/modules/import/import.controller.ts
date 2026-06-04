import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ImportService } from './import.service';

@Controller('import')
@UseGuards(JwtAuthGuard)
export class ImportController {
  constructor(private readonly svc: ImportService) {}

  @Post('fuel')
  importFuel(@Body() body: { records: any[] }): Promise<any> {
    return this.svc.importFuel(body.records);
  }

  @Post('total-mobility')
  importTotalMobility(@Body() body: { records: any[] }): Promise<any> {
    return this.svc.importTotalMobility(body.records);
  }

  @Post('maintenance')
  importMaintenance(@Body() body: { records: any[] }): Promise<any> {
    return this.svc.importMaintenance(body.records);
  }

  @Post('insurance')
  importInsurance(@Body() body: { records: any[] }): Promise<any> {
    return this.svc.importInsurance(body.records);
  }

  @Post('rental')
  importRental(@Body() body: { records: any[] }): Promise<any> {
    return this.svc.importRental(body.records);
  }

  @Post('infractions')
  importInfractions(@Body() body: { records: any[] }): Promise<any> {
    return this.svc.importInfractions(body.records);
  }

  @Post('depreciation')
  importDepreciation(@Body() body: { records: any[] }): Promise<any> {
    return this.svc.importDepreciation(body.records);
  }
}
