import Supabase from './SupabaseHelper';
import ChromaDB from './ChromaDBHelper';
import type { VectorDatabase } from '../types/VectorDatabase';
import { DatabaseType } from '@common';

const DatabaseRegistry: Record<DatabaseType, new () => VectorDatabase> = {
  [DatabaseType.SUPABASE]: Supabase,
  [DatabaseType.CHROMA]: ChromaDB,
};

export const createDatabaseHelper = (type: DatabaseType) => {
  return new DatabaseRegistry[type]();
};
