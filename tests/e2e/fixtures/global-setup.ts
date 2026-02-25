import { execSync } from 'child_process';
import { setTimeout as delay } from 'timers/promises';

const SERVICES = ['chromadb', 'rabbitmq', 'ollama'] as const;
const START_TIMEOUT_MS = 180_000;
const MODEL_PULL_TIMEOUT_MS = 600_000;
const RETRY_INTERVAL_MS = 1_000;
const EMBEDDING_MODEL = 'nomic-embed-text:latest';

function execCommand(command: string): string {
  return execSync(command, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

async function waitForRunningContainer(service: (typeof SERVICES)[number]) {
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

async function waitForRabbitMqHealthy(containerId: string) {
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

async function waitForCommand(
  command: string,
  label: string,
  timeoutMs = START_TIMEOUT_MS,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      execSync(command, { stdio: 'ignore' });
      return;
    } catch {
      // Dependency is not ready yet.
    }

    await delay(RETRY_INTERVAL_MS);
  }

  throw new Error(`Timed out waiting for ${label}.`);
}

function parseInstalledModels(output: string): string[] {
  return output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(1)
    .map((line) => line.split(/\s+/)[0])
    .filter((model) => model.length > 0);
}

function modelExists(models: string[], targetModel: string): boolean {
  if (models.includes(targetModel)) {
    return true;
  }

  if (targetModel.includes(':')) {
    return false;
  }

  return models.includes(`${targetModel}:latest`);
}

async function ensureOllamaModel(model: string): Promise<void> {
  const installedModels = parseInstalledModels(
    execCommand('docker compose exec -T ollama ollama list'),
  );

  if (modelExists(installedModels, model)) {
    return;
  }

  console.log(`[e2e setup] Pulling missing Ollama model "${model}"...`);
  await waitForCommand(
    `docker compose exec -T ollama ollama pull ${model}`,
    `ollama model "${model}" to be pulled`,
    MODEL_PULL_TIMEOUT_MS,
  );
}

async function warmOllamaModels(chatModel?: string) {
  const warmEmbeddingPayload = JSON.stringify({
    model: EMBEDDING_MODEL,
    prompt: 'hi',
  });

  const warmupCommands: Promise<void>[] = [
    waitForCommand(
      `curl -fsS http://localhost:11434/api/embeddings -H 'Content-Type: application/json' -d '${warmEmbeddingPayload}' > /dev/null`,
      `ollama embedding model "${EMBEDDING_MODEL}" to warm up`,
    ),
  ];

  if (chatModel) {
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
      ),
    );
  } else {
    console.log(
      '[e2e setup] OLLAMA_CHAT_MODEL not set, skipping explicit chat model warm-up.',
    );
  }

  await Promise.all(warmupCommands);
}

function detectInstalledChatModel(): string | undefined {
  const models = parseInstalledModels(
    execCommand('docker compose exec -T ollama ollama list'),
  );

  return models.find((model) => !model.startsWith('nomic-embed-text'));
}

async function globalSetup() {
  console.log(
    '[e2e setup] Starting infrastructure dependencies (chromadb, rabbitmq, ollama)...',
  );

  try {
    execSync(`docker compose up -d --build ${SERVICES.join(' ')}`, {
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

    const configuredChatModel = process.env.OLLAMA_CHAT_MODEL;
    const detectedChatModel = configuredChatModel || detectInstalledChatModel();

    if (!configuredChatModel && detectedChatModel) {
      process.env.OLLAMA_CHAT_MODEL = detectedChatModel;
      console.log(
        `[e2e setup] OLLAMA_CHAT_MODEL not set, detected "${detectedChatModel}" from ollama list.`,
      );
    }

    await ensureOllamaModel(EMBEDDING_MODEL);
    if (detectedChatModel) {
      await ensureOllamaModel(detectedChatModel);
    }

    await warmOllamaModels(detectedChatModel);

    console.log(
      `[e2e setup] Services are ready and warmed (chroma=${chromaContainerId.slice(0, 12)}, rabbitmq=${rabbitContainerId.slice(0, 12)}, ollama=${ollamaContainerId.slice(0, 12)})`,
    );
  } catch (error) {
    console.error('[e2e setup] Failed to start infrastructure:', error);
    throw error;
  }
}

export default globalSetup;
