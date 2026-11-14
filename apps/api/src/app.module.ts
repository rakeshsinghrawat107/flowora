import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { DiagramsModule } from './diagrams/diagrams.module';
import { DatabaseModule } from './database/database.module';

/**
 * MVP wiring: health + diagrams (in-memory repository).
 * DatabaseModule only connects TypeORM/PostgreSQL when DATABASE_URL is set —
 * cloud sync is Phase 2 and the web app is local-first until then.
 */
@Module({
  imports: [DatabaseModule.register(), DiagramsModule],
  controllers: [HealthController],
})
export class AppModule {}
