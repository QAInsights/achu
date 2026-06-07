import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import IssueReviewForm from '../src/renderer/components/IssueReviewForm';
import { GitHubIssuePayload } from '../src/renderer/utils/githubAgentUtils';

const mockPayload: GitHubIssuePayload = {
  title: 'Login button crashes app',
  severity: 'critical',
  severityReason: 'App exits completely on tap',
  reproSteps: ['Open app', 'Tap login'],
  expected: 'Login page shows',
  actual: 'App crashes',
  components: ['LoginButton'],
  labels: ['bug'],
  markdownBody: '## Bug Report\n\n**Severity:** 🔴 Critical',
};

const mockContext = {
  issuePayload: mockPayload,
  setIssuePayload: vi.fn(),
  githubRepo: 'owner/repo',
  setGithubRepo: vi.fn(),
  githubRepoList: ['owner/repo', 'owner/other'],
  setGithubRepoList: vi.fn(),
  showComponentHighlights: true,
  setShowComponentHighlights: vi.fn(),
  burnHighlights: true,
  setBurnHighlights: vi.fn(),
  setHighlightedComponents: vi.fn(),
  pushIssueToGitHub: vi.fn().mockResolvedValue(undefined),
  resetIssue: vi.fn(),
  appendAttribution: false,
};

vi.mock('../src/renderer/AppContext', () => ({
  useAppContext: () => mockContext,
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../src/renderer/utils/githubApiUtils', () => ({
  fetchUserRepos: vi.fn().mockResolvedValue([]),
}));

describe('IssueReviewForm – Copy Markdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (window as any).snapFrameAPI = {
      getGitHubToken: vi.fn().mockResolvedValue(null),
      copyTextToClipboard: vi.fn().mockResolvedValue(true),
    };

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true,
    });
  });

  it('renders the Copy Markdown button', () => {
    render(<IssueReviewForm />);
    expect(screen.getByText('Copy Markdown')).toBeTruthy();
  });

  it('calls copyTextToClipboard via snapFrameAPI with markdownBody on click', async () => {
    render(<IssueReviewForm />);
    fireEvent.click(screen.getByText('Copy Markdown'));

    await waitFor(() => {
      expect((window as any).snapFrameAPI.copyTextToClipboard).toHaveBeenCalledWith(
        mockPayload.markdownBody
      );
    });
  });

  it('shows "Copied!" feedback after successful copy', async () => {
    render(<IssueReviewForm />);
    fireEvent.click(screen.getByText('Copy Markdown'));

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeTruthy();
    });
  });

  it('falls back to navigator.clipboard when snapFrameAPI is unavailable', async () => {
    (window as any).snapFrameAPI = undefined;

    render(<IssueReviewForm />);
    fireEvent.click(screen.getByText('Copy Markdown'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockPayload.markdownBody);
    });
  });

  it('falls back to navigator.clipboard when copyTextToClipboard returns false', async () => {
    (window as any).snapFrameAPI = {
      getGitHubToken: vi.fn().mockResolvedValue(null),
      copyTextToClipboard: vi.fn().mockResolvedValue(false),
    };

    render(<IssueReviewForm />);
    fireEvent.click(screen.getByText('Copy Markdown'));

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockPayload.markdownBody);
    });
  });

  it('still shows "Copied!" after fallback to navigator.clipboard succeeds', async () => {
    (window as any).snapFrameAPI = undefined;

    render(<IssueReviewForm />);
    fireEvent.click(screen.getByText('Copy Markdown'));

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeTruthy();
    });
  });
});
