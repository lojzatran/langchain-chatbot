import { env } from '@common';
import { writeFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { NextRequest } from 'next/server';
import amqplib from 'amqplib';

export async function GET() {
  const isSupabaseGeminiEnabled = Boolean(env.GOOGLE_API_KEY);

  return Response.json({
    supabaseGeminiEnabled: isSupabaseGeminiEnabled,
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Use configured storage directory or fallback to local workspace root
    const workspaceRoot = resolve(process.cwd(), '../../');
    const storageDir =
      process.env.STORAGE_DIR || join(workspaceRoot, 'uploads');

    // Ensure directory exists
    await mkdir(storageDir, { recursive: true });

    const path = join(storageDir, file.name);
    await writeFile(path, buffer);

    const rabbitmqUrl = env.RABBITMQ_URL;
    const connection = await amqplib.connect(rabbitmqUrl);
    const channel = await connection.createConfirmChannel();
    await channel.assertQueue('fill_vector_store', { durable: false });

    channel.sendToQueue(
      'fill_vector_store',
      Buffer.from(JSON.stringify({ file: path })),
      { persistent: true },
    );

    await channel.waitForConfirms();
    await connection.close();

    return Response.json({
      success: true,
      message: `File ${file.name} uploaded successfully`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return Response.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
