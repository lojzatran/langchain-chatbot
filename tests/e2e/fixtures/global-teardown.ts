import { execSync } from 'child_process';

async function globalTeardown() {
  console.log('Shutting down infrastructure dependencies...');
  try {
    // Stop and remove the containers for the infrastructure services
    execSync('docker compose stop chromadb rabbitmq ollama', {
      stdio: 'inherit',
    });
    console.log('Infrastructure stopped.');
  } catch (error) {
    console.error('Error during infrastructure teardown:', error);
  }
}

export default globalTeardown;
