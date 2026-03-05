import Supabase from './SupabaseHelper';
import ChromaDB from './ChromaDBHelper';
import type { VectorDatabaseImpl } from './VectorDatabase';
import { DatabaseType } from '@common';

const DatabaseRegistry: Record<
  DatabaseType,
  new () => VectorDatabaseImpl<any>
> = {
  [DatabaseType.SUPABASE]: Supabase,
  [DatabaseType.CHROMA]: ChromaDB,
};

export const createDatabaseHelper = (type: DatabaseType) => {
  return new DatabaseRegistry[type]();
};
