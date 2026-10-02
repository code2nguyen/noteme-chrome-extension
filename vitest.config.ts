import { defineConfig } from 'vitest/config';

// Unit tests cover the framework-free logic (data migration, text extraction). Components are checked by loading
// the unpacked extension in Chrome.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
