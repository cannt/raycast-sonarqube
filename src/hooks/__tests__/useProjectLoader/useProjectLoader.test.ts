import { useProjectLoader } from "../../useProjectLoader";
import { loadProjects } from "../../../utils";

// Mock the loadProjects function
jest.mock("../../../utils", () => ({
  loadProjects: jest.fn(),
}));

// Mock the React hooks
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
const mockSetProjects = jest.fn();
const mockSetIsLoading = jest.fn();
const mockSetError = jest.fn();

jest.mock("react", () => ({
  useState: jest.fn((initialValue) => {
    if (Array.isArray(initialValue)) {
      return [initialValue, mockSetProjects];
    } else if (typeof initialValue === "boolean") {
      return [initialValue, mockSetIsLoading];
    } else {
      return [initialValue, mockSetError];
    }
  }),
  useEffect: jest.fn((callback) => callback()),
}));

describe("useProjectLoader", () => {
  const mockProjects = [
    { id: "1", name: "Project 1", path: "/path/to/project1" },
    { id: "2", name: "Project 2", path: "/path/to/project2" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should load projects successfully", async () => {
    // Mock successful project loading
    (loadProjects as jest.Mock).mockResolvedValue(mockProjects);

    // Call the hook
    useProjectLoader();

    // Check initial state
    expect(mockSetIsLoading).toHaveBeenCalledWith(true);

    // Wait for the async operation to complete
    await Promise.resolve();

    // Should have loaded projects
    expect(mockSetProjects).toHaveBeenCalledWith(mockProjects);
    expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    expect(mockSetError).toHaveBeenCalledWith(null);
    expect(loadProjects).toHaveBeenCalledTimes(1);
  });

  it("should handle errors when loading projects", async () => {
    // Mock error when loading projects
    const error = new Error("Failed to load projects");
    (loadProjects as jest.Mock).mockRejectedValue(error);

    // Call the hook
    useProjectLoader();

    // Check initial state
    expect(mockSetIsLoading).toHaveBeenCalledWith(true);

    // Wait for the async operation to complete
    await Promise.resolve();

    // Should have error state
    expect(mockSetProjects).toHaveBeenCalledWith([]);
    expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    expect(mockSetError).toHaveBeenCalledWith(error);
    expect(loadProjects).toHaveBeenCalledTimes(1);
  });
});
