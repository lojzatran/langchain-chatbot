import { env } from "@/utils/env";
import { writeFile } from "fs/promises";
import { join } from "path";
import { NextRequest } from "next/server";

export async function GET() {
  const isSupabaseGeminiOpenAiEnabled =
    Boolean(env.GOOGLE_API_KEY) && Boolean(env.OPENAI_API_KEY);

  return Response.json({
    supabaseGeminiOpenAiEnabled: isSupabaseGeminiOpenAiEnabled,
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Save to assets folder
    const path = join(process.cwd(), "assets", file.name);
    await writeFile(path, buffer);

    return Response.json({
      success: true,
      message: `File ${file.name} uploaded successfully`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return Response.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
