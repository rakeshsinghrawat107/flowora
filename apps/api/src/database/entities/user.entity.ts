import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DiagramEntity } from './diagram.entity';
import { Folder } from './folder.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 200 })
  displayName!: string;

  /** bcrypt hash; null for accounts created via OAuth only. */
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @OneToMany(() => DiagramEntity, (diagram) => diagram.owner)
  diagrams!: DiagramEntity[];

  @OneToMany(() => Folder, (folder) => folder.owner)
  folders!: Folder[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
