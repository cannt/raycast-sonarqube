/// <reference types="jest" />
import { openSonarQubeAppLogic as openSonarQubeApp } from "../../lib/sonarQubeOpener";

jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  open: jest.fn(),
  showToast: jest.fn().mockResolvedValue({ style: '', title: '', message: '' }),
  Toast: { Style: { Animated: 'Animated', Success: 'Success', Failure: 'Failure' } },
  openExtensionPreferences: jest.fn(),
}));

const { getPreferenceValues, open, showToast, openExtensionPreferences } = require("@raycast/api");

describe("openSonarQubeApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens default URL if custom is not used", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: false });
    await openSonarQubeApp();
    expect(open).toHaveBeenCalledWith("http://localhost:9000");
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ 
        style: "Success", 
        title: expect.any(String),
        message: expect.stringContaining("http://localhost:9000")
      })
    );
  });

  it("shows error if custom is checked but no path", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: true, sonarqubeAppPath: "" });
    await openSonarQubeApp();
    
    // Verify toast is shown with failure style
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ 
        style: "Failure", 
        title: expect.any(String),
        primaryAction: expect.objectContaining({
          title: expect.any(String),
          onAction: expect.any(Function)
        })
      })
    );
    expect(open).not.toHaveBeenCalled();
    
    // Extract and test the onAction callback
    const mockToast = { hide: jest.fn() };
    const toastArgs = showToast.mock.calls[0][0];
    const onActionCallback = toastArgs.primaryAction.onAction;
    
    // Call the onAction callback and verify it opens preferences and hides the toast
    await onActionCallback(mockToast);
    expect(openExtensionPreferences).toHaveBeenCalled();
    expect(mockToast.hide).toHaveBeenCalled();
  });

  it("opens custom path if set", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: true, sonarqubeAppPath: "http://custom.sonar:9000" });
    await openSonarQubeApp();
    expect(open).toHaveBeenCalledWith("http://custom.sonar:9000");
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ 
        style: "Success", 
        title: expect.any(String),
        message: expect.stringContaining("http://custom.sonar:9000")
      })
    );
  });

  it("shows failure toast if open throws an Error", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: false });
    open.mockImplementationOnce(() => { throw new Error("fail"); });
    
    // Spy on console.error to verify it's called with the error message
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await openSonarQubeApp();
    
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: "Failure", title: expect.any(String) })
    );
    
    // Verify error logging
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining("http://localhost:9000"));
    expect(consoleErrorSpy).toHaveBeenCalledWith("fail");
    
    // Restore the original console.error
    consoleErrorSpy.mockRestore();
  });

  it("handles non-Error exceptions correctly", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: false });
    // Throw a string instead of an Error object to test the String(error) case
    open.mockImplementationOnce(() => { throw "string error"; });
    
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    await openSonarQubeApp();
    
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ 
        style: "Failure", 
        title: expect.any(String),
        message: "string error" 
      })
    );
    
    // Verify error logging for non-Error exceptions
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String));
    expect(consoleErrorSpy).toHaveBeenCalledWith("string error");
    
    consoleErrorSpy.mockRestore();
  });
});
