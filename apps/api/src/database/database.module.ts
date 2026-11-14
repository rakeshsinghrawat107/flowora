import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Folder } from './entities/folder.entity';
import { DiagramEntity } from './entities/diagram.entity';
import { NodeEntity } from './entities/node.entity';
import { EdgeEntity } from './entities/edge.entity';
import { Template } from './entities/template.entity';
import { DiagramVersion } from './entities/diagram-version.entity';
import { SharePermission } from './entities/share-permission.entity';

export const FLOWORA_ENTITIES = [
  User,
  Folder,
  DiagramEntity,
  NodeEntity,
  EdgeEntity,
  Template,
  DiagramVersion,
  SharePermission,
];

/**
 * PostgreSQL wiring for Phase 2 cloud sync. When DATABASE_URL is unset (the
 * MVP default) this module registers nothing and the API runs entirely
 * in-memory; the web app is local-first until cloud sync ships.
 */
@Module({})
export class DatabaseModule {
  static register(): DynamicModule {
    const url = process.env.DATABASE_URL;
    if (!url) return { module: DatabaseModule };
    return {
      module: DatabaseModule,
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url,
          entities: FLOWORA_ENTITIES,
          // Schema is managed by TypeORM migrations in Phase 2; never auto-sync.
          synchronize: false,
        }),
      ],
    };
  }
}
