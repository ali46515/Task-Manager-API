/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  setupFilesAfterFramework: [],
  globalSetup: "./tests/helpers/globalSetup.js",
  globalTeardown: "./tests/helpers/globalTeardown.js",
  coverageDirectory: "coverage",
  collectCoverageFrom: [
    "controllers/**/*.js",
    "middlewares/**/*.js",
    "models/**/*.js",
    "!**/node_modules/**",
  ],
  testTimeout: 30000,
  verbose: true,
};
