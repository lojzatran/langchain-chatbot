import { z } from 'zod';
import pkg from '@next/env';
const { loadEnvConfig } = pkg;

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const envSchema = z.object({
  GOOGLE_API_KEY: z.string().optional(),
  SPLITTER_CHUNK_SIZE: z.number().default(1100).optional(),
  SPLITTER_CHUNK_OVERLAP: z.number().default(50).optional(),
  BASIC_AUTH_USER: z.string().optional(),
  BASIC_AUTH_PASSWORD: z.string().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_API_KEY: z.string(),
  CHROMA_HOST: z.string().default('localhost').optional(),
});

const skipValidation = process.env.SKIP_ENV_VALIDATION === 'true';

export const env = skipValidation
  ? (process.env as unknown as z.infer<typeof envSchema>)
  : envSchema.parse(process.env);
