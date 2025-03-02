/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1", // ✅ `@/` を `src/` にマッピング！
  },
  transform: {
    "^.+.ts?$": ["ts-jest", {}],
  },
};

export default config;
