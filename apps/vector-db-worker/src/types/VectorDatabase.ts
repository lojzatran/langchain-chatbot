export interface VectorDatabase {
  fill(data: string): Promise<void>;
}