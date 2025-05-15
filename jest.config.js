module.exports = {
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.ts', '**/*.test.tsx', '**/*.test.js', '**/*.test.jsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest"
  }
};
