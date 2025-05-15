/// <reference types="jest" />
import openSonarQubeApp from "./openSonarQubeApp";

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
      expect.objectContaining({ style: "Success", title: expect.any(String) })
    );
  });

  it("shows error if custom is checked but no path", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: true, sonarqubeAppPath: "" });
    await openSonarQubeApp();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: "Failure", title: expect.any(String) })
    );
    expect(open).not.toHaveBeenCalled();
  });

  it("opens custom path if set", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: true, sonarqubeAppPath: "http://custom.sonar:9000" });
    await openSonarQubeApp();
    expect(open).toHaveBeenCalledWith("http://custom.sonar:9000");
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: "Success", title: expect.any(String) })
    );
  });

  it("shows failure toast if open throws", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: false });
    open.mockImplementationOnce(() => { throw new Error("fail"); });
    await openSonarQubeApp();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: "Failure", title: expect.any(String) })
    );
  });
});
