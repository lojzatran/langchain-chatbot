import { env } from "@/utils/env";

export async function GET() {
  const isSupabaseGeminiOpenAiEnabled =
    Boolean(env.GOOGLE_API_KEY) && Boolean(env.OPENAI_API_KEY);

  return Response.json({
    supabaseGeminiOpenAiEnabled: isSupabaseGeminiOpenAiEnabled,
  });
}
