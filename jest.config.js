const path = process.env.JEST_PATH || "**";

export default {
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.json",
      },
    ],
  },
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: [`<rootDir>/${path}/**/__test__/**/*.test.ts`],
  noStackTrace: true,
  errorOnDeprecated: false,
  verbose: true,
  silent: true,
  forceExit: true,
  detectOpenHandles: true,
};
