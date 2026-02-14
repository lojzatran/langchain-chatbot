import { config as loadDotEnv } from 'dotenv';
import { resolve } from 'path';
import { z } from 'zod';

// Load shared workspace env first, then app-local overrides.
loadDotEnv({ path: resolve(process.cwd(), '../../.env') });
loadDotEnv({ path: '.env', override: true });

const envSchema = z.object({
  GOOGLE_API_KEY: z.string().optional(),
  SPLITTER_CHUNK_SIZE: z.coerce.number().default(1100),
  SPLITTER_CHUNK_OVERLAP: z.coerce.number().default(50),
  SUPABASE_URL: z.string().url(),
  SUPABASE_API_KEY: z.string(),
  CHROMA_HOST: z.string().default('localhost'),
  CHROMA_PORT: z.coerce.number().default(8000),
  CHROMA_SSL: z.boolean().default(false),
  RABBITMQ_URL: z.string().default('amqp://localhost'),
});

const skipValidation = process.env.SKIP_ENV_VALIDATION === 'true';

export const env = skipValidation
  ? (process.env as unknown as z.infer<typeof envSchema>)
  : envSchema.parse(process.env);
