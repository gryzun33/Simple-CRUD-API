/** @type {import('ts-jest').JestConfigWithTsJest} **/
const config = {
  preset: 'ts-jest',
  moduleFileExtensions: ['ts', 'js'],
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
};

export default config;
