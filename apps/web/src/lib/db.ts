import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Diagram } from '@flowora/shared';

/**
 * IndexedDB persistence (local-first, no account required).
 *
 * Two stores:
 * - `diagrams`: committed, user-saved diagrams (manual save / creation).
 * - `drafts`: autosaved work-in-progress, keyed by diagram id. A draft newer
 *   than the committed version triggers the recovery banner on open; it is
 *   never applied silently.
 */
export interface DraftRecord {
  diagramId: string;
  content: Diagram;
  updatedAt: string;
}

interface FloworaDB extends DBSchema {
  diagrams: { key: string; value: Diagram };
  drafts: { key: string; value: DraftRecord };
}

const DB_NAME = 'flowora';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<FloworaDB>> | null = null;

function getDb(): Promise<IDBPDatabase<FloworaDB>> {
  if (!dbPromise) {
    dbPromise = openDB<FloworaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('diagrams', { keyPath: 'id' });
        db.createObjectStore('drafts', { keyPath: 'diagramId' });
      },
    });
  }
  return dbPromise;
}

export interface DiagramRepository {
  listDiagrams(): Promise<Diagram[]>;
  getDiagram(id: string): Promise<Diagram | undefined>;
  putDiagram(diagram: Diagram): Promise<void>;
  deleteDiagram(id: string): Promise<void>;
  getDraft(diagramId: string): Promise<DraftRecord | undefined>;
  putDraft(draft: DraftRecord): Promise<void>;
  deleteDraft(diagramId: string): Promise<void>;
}

export class IndexedDBDiagramRepository implements DiagramRepository {
  async listDiagrams(): Promise<Diagram[]> {
    const db = await getDb();
    const all = await db.getAll('diagrams');
    return all.sort((a, b) => Date.parse(b.metadata.updatedAt) - Date.parse(a.metadata.updatedAt));
  }

  async getDiagram(id: string): Promise<Diagram | undefined> {
    return (await getDb()).get('diagrams', id);
  }

  async putDiagram(diagram: Diagram): Promise<void> {
    await (await getDb()).put('diagrams', diagram);
  }

  async deleteDiagram(id: string): Promise<void> {
    const db = await getDb();
    await db.delete('diagrams', id);
    await db.delete('drafts', id);
  }

  async getDraft(diagramId: string): Promise<DraftRecord | undefined> {
    return (await getDb()).get('drafts', diagramId);
  }

  async putDraft(draft: DraftRecord): Promise<void> {
    await (await getDb()).put('drafts', draft);
  }

  async deleteDraft(diagramId: string): Promise<void> {
    await (await getDb()).delete('drafts', diagramId);
  }
}

export const diagramRepository: DiagramRepository = new IndexedDBDiagramRepository();
