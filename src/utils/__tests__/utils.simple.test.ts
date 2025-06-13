/// <reference types="jest" />

jest.unmock("@/utils");

// Import the entire module to avoid potential circular dependencies
import {
  SONARQUBE_PROJECTS_STORAGE_KEY,
  runCommand,
  isSonarQubeRunning,
  generateId,
  loadProjects,
  saveProjects,
} from "../index";

// Simple test to verify we can access exports
describe("Utils Simple Tests", () => {
  it("can access SONARQUBE_PROJECTS_STORAGE_KEY", () => {
    expect(SONARQUBE_PROJECTS_STORAGE_KEY).toBe("sonarqubeProjectsList");
  });

  it("can access runCommand function", () => {
    expect(typeof runCommand).toBe("function");
  });

  it("can access isSonarQubeRunning function", () => {
    expect(typeof isSonarQubeRunning).toBe("function");
  });

  it("can access generateId function", () => {
    expect(typeof generateId).toBe("function");
  });

  it("can access loadProjects function", () => {
    expect(typeof loadProjects).toBe("function");
  });

  it("can access saveProjects function", () => {
    expect(typeof saveProjects).toBe("function");
  });
});
