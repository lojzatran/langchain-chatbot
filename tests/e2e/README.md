# E2E Testing with Playwright

This directory contains the end-to-end tests for the Chatbot application.

## Structure

- `pages/`: Page Object Models (POM) representing the UI components and pages.
- `fixtures/`: Custom Playwright fixtures for test setup and teardown.
- `utils/`: Common utilities and helpers for tests.
- `*.spec.ts`: The actual test files.

## Running Tests

To run the tests, use the following commands:

```bash
# Run all tests
npx playwright test

# Run tests in headed mode (visible browser)
npx playwright test --headed

# Debugging tests
npx playwright test --debug
```

## Best Practices

- Use **Page Object Model** for all page interactions.
- Avoid hardcoded timeouts; use Playwright's auto-waiting features.
- Prefer `data-testid` or accessible roles for selectors.
