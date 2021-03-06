module.exports = {
  'transform': {
    '.(ts|tsx)': 'ts-jest'
  },
  'testTimeout': 30 * 1000,
  'collectCoverageFrom': [
    'src/**/*',
    '!**/node_modules/**'
  ],
  'coveragePathIgnorePatterns': [
    'node_modules/'
  ],
  'testPathIgnorePatterns': [
    '/node_modules/',
    '/lib/'
  ],
  'modulePathIgnorePatterns': [
    '<rootDir>/lib'
  ],
  "testEnvironment": "node"
};
