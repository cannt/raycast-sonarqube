/**
 * Jest setup file to configure common mocks used across tests
 */

// Mock Raycast API
jest.mock('@raycast/api', () => {
  return require('./mocks/raycast-api');
}, { virtual: true });

// Suppress console pollution during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});
