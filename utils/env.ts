import { z } from "zod";
import pkg from "@next/env";
const { loadEnvConfig } = pkg;

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const envSchema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_API_KEY: z.string(),
  GOOGLE_GEMINI_API_KEY: z.string(),
  SPLITTER_CHUNK_SIZE: z.number().default(1100).optional(),
  SPLITTER_CHUNK_OVERLAP: z.number().default(50).optional(),
  OPENAI_API_KEY: z.string(),
  BASIC_AUTH_USER: z.string().optional(),
  BASIC_AUTH_PASSWORD: z.string().optional(),
});

export const env = envSchema.parse(process.env);
