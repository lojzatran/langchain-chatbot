import amqplib, { type ConfirmChannel, type GetMessage } from 'amqplib';
import { constants as fsConstants } from 'node:fs';
import { access, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { NextRequest } from 'next/server';
import { env } from '@common';
import { POST } from '../../../apps/chatbot/src/app/api/chatbots/config/route';

const QUEUE_NAME = 'fill_vector_store';
const TEST_UPLOAD_DIR = join(
  process.cwd(),
  'tests',
  'integration',
  'tmp',
  'uploads',
);

const MESSAGE_WAIT_TIMEOUT_MS = 5_000;
const MESSAGE_WAIT_INTERVAL_MS = 100;

async function waitForQueueMessage(
  channel: ConfirmChannel,
): Promise<GetMessage | false> {
  const deadline = Date.now() + MESSAGE_WAIT_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const message = await channel.get(QUEUE_NAME, { noAck: true });
    if (message) {
      return message;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, MESSAGE_WAIT_INTERVAL_MS),
    );
  }

  return false;
}

describe('POST /api/chatbots/config integration', () => {
  afterEach(async () => {
    delete process.env.STORAGE_DIR;
    await rm(TEST_UPLOAD_DIR, { recursive: true, force: true });
  });

  test('uploads file and publishes filepath message to rabbitmq queue', async () => {
    process.env.STORAGE_DIR = TEST_UPLOAD_DIR;
    await mkdir(TEST_UPLOAD_DIR, { recursive: true });

    const connection = await amqplib.connect(env.RABBITMQ_URL);
    const channel = await connection.createConfirmChannel();

    try {
      await channel.assertQueue(QUEUE_NAME, { durable: false });
      await channel.purgeQueue(QUEUE_NAME);

      const fileName = `fake-upload-${Date.now()}-${randomUUID()}.txt`;
      const expectedFilePath = join(TEST_UPLOAD_DIR, fileName);

      const formData = new FormData();
      formData.append(
        'file',
        new File(['fake integration file content'], fileName, {
          type: 'text/plain',
        }),
      );

      const request = new NextRequest('http://localhost/api/chatbots/config', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(request);
      const responseBody = await response.json();

      expect(response.status).toBe(200);
      expect(responseBody).toEqual(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining(fileName),
        }),
      );

      await access(expectedFilePath, fsConstants.F_OK);

      const message = await waitForQueueMessage(channel);
      expect(message).toBeTruthy();

      // @ts-expect-error message is asserted truthy in the line above
      const payload = JSON.parse(message!.content.toString()) as {
        file: string;
      };
      expect(payload.file).toBe(expectedFilePath);
    } finally {
      await channel.close();
      await connection.close();
    }
  });
});
