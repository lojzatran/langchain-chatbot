import { execSync } from 'child_process';

async function globalSetup() {
  console.log(
    'Starting infrastructure dependencies (chromadb, rabbitmq, ollama)...',
  );
  try {
    // Start only the necessary infrastructure services
    execSync('docker compose up -d chromadb rabbitmq ollama', {
      stdio: 'inherit',
    });

    // Give RabbitMQ a bit more time to be healthy if needed,
    // though docker-compose 'depends_on' in the app might handle it.
    // For E2E, we want to be sure.
    console.log('Waiting for infrastructure to be ready...');
  } catch (error) {
    console.error('Failed to start infrastructure:', error);
    throw error;
  }
}

export default globalSetup;
