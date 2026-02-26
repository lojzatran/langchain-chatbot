import { execSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { pathToFileURL } from 'node:url';
import { CHATBOT_CONSTANTS } from '@common';

const SERVICES = ['chromadb', 'rabbitmq', 'ollama'];
const EMBEDDING_MODEL = CHATBOT_CONSTANTS.MODELS.LOCAL.EMBEDDING;
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL;
const logPrefix = 'infra setup';

const DEFAULT_START_TIMEOUT_MS = 120_000;
const DEFAULT_MODEL_PULL_TIMEOUT_MS = 600_000;
const RETRY_INTERVAL_MS = 1_000;

function execCommand(command) {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function waitForCommand(
  command,
  label,
  {
    timeoutMs = DEFAULT_START_TIMEOUT_MS,
    retryIntervalMs = RETRY_INTERVAL_MS,
  } = {},
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      execSync(command, { stdio: 'ignore' });
      return;
    } catch {
      // Dependency is not ready yet.
    }

    await delay(retryIntervalMs);
  }

  throw new Error(`Timed out waiting for ${label}.`);
}

async function waitForRunningContainer(
  service,
  { timeoutMs = DEFAULT_START_TIMEOUT_MS, retryIntervalMs = RETRY_INTERVAL_MS },
) {
  const deadline = Date.now() + timeoutMs;

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
    await delay(retryIntervalMs);
  }

  throw new Error(
    `Timed out waiting for "${service}" container to be running.`,
  );
}

async function waitForRabbitMqHealthy(
  containerId,
  { timeoutMs = DEFAULT_START_TIMEOUT_MS, retryIntervalMs = RETRY_INTERVAL_MS },
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const health = execCommand(
      `docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}" ${containerId}`,
    );

    if (health === 'healthy') {
      return;
    }

    await delay(retryIntervalMs);
  }

  throw new Error('Timed out waiting for rabbitmq to become healthy.');
}

async function startInfrastructure({
  build = false,
  timeoutMs = DEFAULT_START_TIMEOUT_MS,
} = {}) {
  console.log(
    `[${logPrefix}] Starting infrastructure services: chromadb, rabbitmq, ollama`,
  );

  const buildArg = build ? '--build ' : '';
  execSync(`docker compose up -d ${buildArg}${SERVICES.join(' ')}`, {
    stdio: 'inherit',
  });

  const [chromaContainerId, rabbitContainerId, ollamaContainerId] =
    await Promise.all(
      SERVICES.map((service) =>
        waitForRunningContainer(service, { timeoutMs }),
      ),
    );

  await waitForRabbitMqHealthy(rabbitContainerId, { timeoutMs });

  await Promise.all([
    waitForCommand(
      "docker compose exec -T chromadb bash -lc 'cat < /dev/null > /dev/tcp/127.0.0.1/8000'",
      'chromadb to accept connections on port 8000',
      { timeoutMs },
    ),
    waitForCommand('docker compose exec -T ollama ollama list', 'ollama CLI', {
      timeoutMs,
    }),
  ]);

  return {
    chromaContainerId,
    rabbitContainerId,
    ollamaContainerId,
  };
}

function parseInstalledModels(output) {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => line.split(/\s+/)[0])
    .filter((model) => model.length > 0);
}

function modelExists(models, targetModel) {
  if (models.includes(targetModel)) {
    return true;
  }

  if (targetModel.includes(':')) {
    return false;
  }

  return models.includes(`${targetModel}:latest`);
}

async function ensureOllamaModel(
  model,
  {
    logPrefix = 'infra setup',
    modelPullTimeoutMs = DEFAULT_MODEL_PULL_TIMEOUT_MS,
  } = {},
) {
  const installedModels = parseInstalledModels(
    execCommand('docker compose exec -T ollama ollama list'),
  );

  if (modelExists(installedModels, model)) {
    return;
  }

  console.log(`[${logPrefix}] Pulling missing Ollama model "${model}"...`);
  await waitForCommand(
    `docker compose exec -T ollama ollama pull ${model}`,
    `ollama model "${model}" to be pulled`,
    { timeoutMs: modelPullTimeoutMs },
  );
}

async function warmOllamaModels({
  chatModel,
  embeddingModel = EMBEDDING_MODEL,
  timeoutMs = DEFAULT_START_TIMEOUT_MS,
} = {}) {
  const warmEmbeddingPayload = JSON.stringify({
    model: embeddingModel,
    prompt: 'hi',
  });

  const warmupCommands = [
    waitForCommand(
      `curl -fsS http://localhost:11434/api/embeddings -H 'Content-Type: application/json' -d '${warmEmbeddingPayload}' > /dev/null`,
      `ollama embedding model "${embeddingModel}" to warm up`,
      { timeoutMs },
    ),
  ];

  const warmChatPayload = JSON.stringify({
    model: chatModel,
    prompt: 'hi',
    stream: false,
    options: { num_predict: 1 },
  });

  warmupCommands.push(
    waitForCommand(
      `curl -fsS http://localhost:11434/api/generate -H 'Content-Type: application/json' -d '${warmChatPayload}' > /dev/null`,
      `ollama chat model "${chatModel}" to warm up`,
      { timeoutMs },
    ),
  );

  await Promise.all(warmupCommands);
}

async function startAndWarmInfrastructure({
  build = false,
  timeoutMs = DEFAULT_START_TIMEOUT_MS,
  modelPullTimeoutMs = DEFAULT_MODEL_PULL_TIMEOUT_MS,
} = {}) {
  const { chromaContainerId, rabbitContainerId, ollamaContainerId } =
    await startInfrastructure({ logPrefix, build, timeoutMs });

  await ensureOllamaModel(EMBEDDING_MODEL, {
    logPrefix,
    modelPullTimeoutMs,
  });

  await ensureOllamaModel(CHAT_MODEL, {
    logPrefix,
    modelPullTimeoutMs,
  });

  await warmOllamaModels({
    chatModel: CHAT_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    timeoutMs,
  });

  console.log(
    `[${logPrefix}] Services are ready and warmed (chroma=${chromaContainerId.slice(0, 12)}, rabbitmq=${rabbitContainerId.slice(0, 12)}, ollama=${ollamaContainerId.slice(0, 12)})`,
  );

  return {
    chromaContainerId,
    rabbitContainerId,
    ollamaContainerId,
  };
}

export default async function globalSetup() {
  await startAndWarmInfrastructure({
    build: false,
    timeoutMs: 120_000,
  });
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  startAndWarmInfrastructure({
    build: true,
    timeoutMs: 180_000,
    modelPullTimeoutMs: 600_000,
  }).catch((error) => {
    console.error('[e2e setup] Failed to start infrastructure:', error);
    process.exitCode = 1;
  });
}
