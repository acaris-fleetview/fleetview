import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './modules/auth/auth.module';
import { FleetModule } from './modules/fleet/fleet.module';
import { TelemetryModule } from './modules/telemetry/telemetry.module';
import { FuelModule,
    ConnectorsModule,
    ImportModule,
  ],
})
export class AppModule {}
odule } from './modules/fuel/fuel.module';
import { ConnectorsModule } from './modules/connectors/connectors.module';
import { ImportModule } from './modules/import/import.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        database: config.get('DB_NAME', 'fleetview'),
        username: config.get('DB_USER', 'fleetview'),
        password: config.get('DB_PASSWORD'),
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get('NODE_ENV') === 'development',
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    ScheduleModule.forRoot(),
    AuthModule,
    FleetModule,
    TelemetryModule,
    FuelM