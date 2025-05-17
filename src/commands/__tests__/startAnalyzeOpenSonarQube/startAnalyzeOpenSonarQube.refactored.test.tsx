import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { showToast, openExtensionPreferences } from '@raycast/api';
import { startAnalyzeOpenSonarQube, default as Command } from '../../../commands/startAnalyzeOpenSonarQube.refactored';
import { useProjectLoader } from '../../../hooks/useProjectLoader';
import { useSonarQubePath } from '../../../hooks/useSonarQubePath';
import { useCommandSequencer } from '../../../hooks/useCommandSequencer';

// Mock the imports
jest.mock('@raycast/api', () => ({
  getPreferenceValues: jest.fn(() => ({
    sonarqubePodmanDir: '/mock/path',
    useCustomSonarQubeApp: false,
    sonarqubeAppPath: '',
  })),
  showToast: jest.fn().mockResolvedValue({
    hide: jest.fn(),
  }),
  openExtensionPreferences: jest.fn(),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure',
    },
  },
}));

jest.mock('../../../i18n', () => ({
  __: jest.fn((key) => key),
}));

jest.mock('../../../hooks/useProjectLoader', () => ({
  useProjectLoader: jest.fn(),
}));

jest.mock('../../../hooks/useSonarQubePath', () => ({
  useSonarQubePath: jest.fn(),
}));

jest.mock('../../../hooks/useCommandSequencer', () => ({
  useCommandSequencer: jest.fn(),
}));

jest.mock('../../../components/ProjectsList', () => ({
  ProjectsList: ({ onStartAnalyze }: { onStartAnalyze: (path: string, name: string) => void }) => (
    <div data-testid="projects-list">
      <button data-testid="analyze-button" onClick={() => onStartAnalyze('/project/path', 'Test Project')}>
        Analyze
      </button>
    </div>
  ),
}));

describe('startAnalyzeOpenSonarQube function', () => {
  const mockPerformStartAnalyzeSequence = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    (useCommandSequencer as jest.Mock).mockReturnValue({
      performStartAnalyzeSequence: mockPerformStartAnalyzeSequence,
    });
  });

  it('should use default SonarQube URL if custom app is not enabled', async () => {
    (require('@raycast/api').getPreferenceValues as jest.Mock).mockReturnValue({
      sonarqubePodmanDir: '/mock/path',
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: '',
    });

    await startAnalyzeOpenSonarQube();

    expect(mockPerformStartAnalyzeSequence).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      'http://localhost:9000'
    );
  });

  it('should show error toast if custom app is enabled but path is empty', async () => {
    (require('@raycast/api').getPreferenceValues as jest.Mock).mockReturnValue({
      sonarqubePodmanDir: '/mock/path',
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: '',
    });

    await startAnalyzeOpenSonarQube();

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: 'failure',
        title: 'preferences.useCustomSonarQubeApp.title',
        message: 'preferences.sonarqubeAppPath.description',
      })
    );
    expect(mockPerformStartAnalyzeSequence).not.toHaveBeenCalled();
  });

  it('should use custom SonarQube app path if enabled and path is set', async () => {
    (require('@raycast/api').getPreferenceValues as jest.Mock).mockReturnValue({
      sonarqubePodmanDir: '/mock/path',
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: '/custom/sonarqube/app',
    });

    await startAnalyzeOpenSonarQube();

    expect(mockPerformStartAnalyzeSequence).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      '/custom/sonarqube/app'
    );
  });

  it('should open preferences when primary action is triggered', async () => {
    (require('@raycast/api').getPreferenceValues as jest.Mock).mockReturnValue({
      sonarqubePodmanDir: '/mock/path',
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: '',
    });

    const mockToast = {
      hide: jest.fn(),
    };
    (showToast as jest.Mock).mockResolvedValue(mockToast);

    await startAnalyzeOpenSonarQube();

    const primaryAction = (showToast as jest.Mock).mock.calls[0][0].primaryAction;
    expect(primaryAction).toBeDefined();
    
    await primaryAction.onAction(mockToast);
    expect(openExtensionPreferences).toHaveBeenCalled();
    expect(mockToast.hide).toHaveBeenCalled();
  });
});

describe('Command component', () => {
  const mockProjects = [
    { id: '1', name: 'Project 1', path: '/path/1' },
    { id: '2', name: 'Project 2', path: '/path/2' },
  ];
  const mockPerformStartAnalyzeSequence = jest.fn();
  const mockGetSonarQubePath = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useProjectLoader as jest.Mock).mockReturnValue({
      projects: mockProjects,
      isLoading: false,
    });
    (useSonarQubePath as jest.Mock).mockReturnValue({
      getSonarQubePath: mockGetSonarQubePath,
    });
    (useCommandSequencer as jest.Mock).mockReturnValue({
      performStartAnalyzeSequence: mockPerformStartAnalyzeSequence,
    });
  });

  it('should render the ProjectsList component', () => {
    render(<Command />);
    expect(screen.getByTestId('projects-list')).toBeInTheDocument();
  });

  it('should call performStartAnalyzeSequence when a project is selected', async () => {
    mockGetSonarQubePath.mockResolvedValue('http://localhost:9000');

    render(<Command />);
    fireEvent.click(screen.getByTestId('analyze-button'));

    await waitFor(() => {
      expect(mockGetSonarQubePath).toHaveBeenCalled();
      expect(mockPerformStartAnalyzeSequence).toHaveBeenCalledWith(
        '/project/path',
        'Test Project',
        'http://localhost:9000'
      );
    });
  });

  it('should not call performStartAnalyzeSequence if getSonarQubePath returns null', async () => {
    mockGetSonarQubePath.mockResolvedValue(null);

    render(<Command />);
    fireEvent.click(screen.getByTestId('analyze-button'));

    await waitFor(() => {
      expect(mockGetSonarQubePath).toHaveBeenCalled();
      expect(mockPerformStartAnalyzeSequence).not.toHaveBeenCalled();
    });
  });
});
