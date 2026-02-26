# Integration Test Scaffolding

This directory hosts infrastructure-backed integration tests using Jest.

## Folder layout

- `specs/`: Integration spec files.
- `fixtures/`: Reusable test data and setup fixtures.
- `helpers/`: Shared utilities for integration tests.
- `jest.config.js`: Jest config for this integration test suite.
- `global-setup.js`: Starts required docker services and waits until ready.
- `global-teardown.js`: Kills and removes integration docker services.

## Run integration tests

```bash
npm run test:integration
```
