const { execSync } = require('node:child_process');

const SERVICES = ['chromadb', 'rabbitmq', 'ollama'];

function run(command) {
  execSync(command, { stdio: 'inherit' });
}

module.exports = async () => {
  console.log(
    '[integration teardown] Killing infrastructure services: chromadb, rabbitmq, ollama',
  );

  try {
    run(`docker compose kill ${SERVICES.join(' ')}`);
  } catch {
    console.log(
      '[integration teardown] Some services were not running at kill time.',
    );
  }

  try {
    run(`docker compose rm -fsv ${SERVICES.join(' ')}`);
  } catch {
    console.log(
      '[integration teardown] Some services could not be removed cleanly.',
    );
  }

  console.log('[integration teardown] Infrastructure services were terminated.');
};
