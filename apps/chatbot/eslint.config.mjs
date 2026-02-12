import nextEslintPluginNext from '@next/eslint-plugin-next';
import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';

export default [
  ...baseConfig,
  ...nx.configs['flat/react-typescript'],
  {
    plugins: {
      '@next/next': nextEslintPluginNext,
    },
    rules: {
      ...nextEslintPluginNext.configs.recommended.rules,
      ...nextEslintPluginNext.configs['core-web-vitals'].rules,
    },
  },
  {
    settings: {
      next: {
        rootDir: 'apps/chatbot',
      },
    },
  },
  {
    ignores: ['.next/**/*'],
  },
];
