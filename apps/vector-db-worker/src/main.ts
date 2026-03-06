import amqp from 'amqplib';
import { readFile } from 'fs/promises';
import { env } from '@common';
import { createDatabaseHelper } from './databases/fill-database-factory';
import { getLogger } from './utils/logger';

const logger = getLogger();

const main = async () => {
  const rabbitmqUrl = env.RABBITMQ_URL;
  const connection = await amqp.connect(rabbitmqUrl);
  const channel = await connection.createChannel();
  await channel.assertQueue('fill_vector_store', { durable: false });

  logger.info('Worker is ready...');

  channel.consume('fill_vector_store', async (msg) => {
    if (msg) {
      let content;
      try {
        content = JSON.parse(msg.content.toString());
      } catch (error) {
        logger.error(error, 'Failed to parse message');
        channel.ack(msg);
        return;
      }

      const filePath = content.file;
      if (filePath) {
        try {
          const fileContent = await readFile(filePath, 'utf-8');
          const dbHelper = createDatabaseHelper(content.dbType);
          await dbHelper.fill(fileContent);
        } catch (err) {
          logger.error(err, `Error processing file ${filePath}`);
        }
      }

      channel.ack(msg);
    }
  });
};

main();
