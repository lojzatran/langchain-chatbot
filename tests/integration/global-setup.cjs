const { execSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');

const SERVICES = ['chromadb', 'rabbitmq', 'ollama'];
const START_TIMEOUT_MS = 120_000;
const RETRY_INTERVAL_MS = 1_000;

function execCommand(command) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function waitForRunningContainer(service) {
  const deadline = Date.now() + START_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const containerId = execCommand(`docker compose ps -q ${service}`);

    if (containerId) {
      const state = execCommand(
        `docker inspect --format "{{.State.Status}}" ${containerId}`,
      );

      if (state === 'running') {
        return containerId;
      }
    }

    await delay(RETRY_INTERVAL_MS);
  }

  throw new Error(
    `Timed out waiting for "${service}" container to be running.`,
  );
}

async function waitForRabbitMqHealthy(containerId) {
  const deadline = Date.now() + START_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const health = execCommand(
      `docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}" ${containerId}`,
    );

    if (health === 'healthy') {
      return;
    }

    await delay(RETRY_INTERVAL_MS);
  }

  throw new Error('Timed out waiting for rabbitmq to become healthy.');
}

async function waitForCommand(command, label) {
  const deadline = Date.now() + START_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      execSync(command, { stdio: 'ignore' });
      return;
    } catch {
      // Service is not ready yet.
    }

    await delay(RETRY_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for ${label}.`);
}

module.exports = async () => {
  console.log(
    '[integration setup] Starting infrastructure services: chromadb, rabbitmq, ollama',
  );

  execSync(`docker compose up -d ${SERVICES.join(' ')}`, {
    stdio: 'inherit',
  });

  const [chromaContainerId, rabbitContainerId, ollamaContainerId] =
    await Promise.all(
      SERVICES.map((service) => waitForRunningContainer(service)),
    );

  await waitForRabbitMqHealthy(rabbitContainerId);

  await Promise.all([
    waitForCommand(
      "docker compose exec -T chromadb bash -lc 'cat < /dev/null > /dev/tcp/127.0.0.1/8000'",
      'chromadb to accept connections on port 8000',
    ),
    waitForCommand(
      'docker compose exec -T ollama ollama list',
      'ollama to accept CLI requests',
    ),
  ]);

  console.log(
    `[integration setup] Services are ready (chroma=${chromaContainerId.slice(0, 12)}, rabbitmq=${rabbitContainerId.slice(0, 12)}, ollama=${ollamaContainerId.slice(0, 12)})`,
  );
};
