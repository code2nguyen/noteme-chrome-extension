import { defineConfig } from 'vitest/config';

// Unit tests cover the framework-free logic (data migration, text extraction) and the release scripts. Components are checked by loading
// the unpacked extension in Chrome.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts', 'scripts/**/*.spec.ts'],
    environment: 'node',
  },
});
