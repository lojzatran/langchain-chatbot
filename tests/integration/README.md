# Integration Test Scaffolding

This directory hosts infrastructure-backed integration tests using Jest.

## Folder layout

- `specs/`: Integration spec files.
- `fixtures/`: Reusable test data and setup fixtures.
- `helpers/`: Shared utilities for integration tests.
- `jest.config.cjs`: Jest config for this integration test suite.
- `global-setup.cjs`: Starts required docker services and waits until ready.
- `global-teardown.cjs`: Kills and removes integration docker services.

## Run integration tests

```bash
npm run test:integration
```
