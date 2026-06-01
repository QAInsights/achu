import { GitHubIssuePayload } from './githubAgentUtils';

export async function fetchUserRepos(token: string): Promise<string[]> {
  const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch user repositories: ${res.status} ${res.statusText}`);
  }
  const repos = await res.json();
  if (!Array.isArray(repos)) return [];
  return repos.map((r: { full_name: string }) => r.full_name);
}

export async function pushToGitHub(
  token: string,
  owner: string,
  repo: string,
  payload: GitHubIssuePayload,
  screenshotBase64: string
): Promise<string> {  // returns created issue URL

  // Step 1: create issue
  const issueRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/issues`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: payload.title,
        body: payload.markdownBody,
        labels: payload.labels
      })
    }
  );

  if (!issueRes.ok) {
    const errText = await issueRes.text();
    throw new Error(`GitHub issue creation failed: ${issueRes.status} ${errText}`);
  }

  const issue = await issueRes.json();
  const issueNumber = issue.number;
  const issueUrl = issue.html_url;

  // Step 2: attach beautified screenshot as comment
  try {
    const filename = `bug-${issueNumber}-${Date.now()}.png`;
    const path = `.github/achu/${filename}`;
    const base64Content = screenshotBase64.includes(',')
      ? screenshotBase64.split(',')[1]
      : screenshotBase64;

    const uploadRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Upload screenshot for issue #${issueNumber}`,
          content: base64Content
        })
      }
    );

    if (uploadRes.ok) {
      const uploadData = await uploadRes.json();
      const imageUrl = uploadData.content.download_url;

      // Step 3: post comment with the screenshot reference
      const commentRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github+json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            body: `### Screenshot\n\n![Bug Screenshot](${imageUrl})`
          })
        }
      );

      if (!commentRes.ok) {
        console.warn('Failed to add comment with screenshot:', await commentRes.text());
      }
    } else {
      console.warn('Failed to upload screenshot contents to repo:', await uploadRes.text());
    }
  } catch (err) {
    console.error('Failed to upload/attach screenshot:', err);
  }

  return issueUrl;
}
