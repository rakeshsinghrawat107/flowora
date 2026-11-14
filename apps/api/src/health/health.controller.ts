import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check(): { status: string; service: string; database: string; timestamp: string } {
    return {
      status: 'ok',
      service: 'flowora-api',
      database: process.env.DATABASE_URL ? 'configured' : 'in-memory (Phase 2: Postgres)',
      timestamp: new Date().toISOString(),
    };
  }
}
