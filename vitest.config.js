const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
    test: {
        include: ['tests/integration/**/*.test.js'],
        testTimeout: 15000,
        hookTimeout: 15000,
        globals: true,
    },
});
