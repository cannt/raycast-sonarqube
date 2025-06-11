---
description: How to deploy the SonarQube Tools extension to the Raycast Store
---

# Deploying to Raycast Store

This workflow describes how to prepare and deploy the SonarQube Tools extension to the Raycast Store.

## Prerequisites

1. A Raycast developer account (https://developers.raycast.com)
2. API token from the Raycast Developer Dashboard

## Preparation Steps

1. Ensure all code changes are committed and tests pass:
   ```bash
   npm test
   ```

2. Verify extension meets all requirements:
   ```bash
   npx @raycast/api lint
   ```

3. Prepare screenshots for the store listing:
   - Create 3-5 screenshots (1600x1000px) showing key features
   - Save them in the `metadata` directory

4. Update version in package.json:
   ```bash
   # Edit package.json to increment version number
   # Example: "1.0.0" → "1.0.1"
   ```

## Deployment Process

1. Add the Raycast API token to GitHub repository:
   - Go to GitHub repository Settings → Secrets → Actions
   - Add a new secret named `RAYCAST_API_TOKEN`
   - Paste your API token from the Raycast Developer Dashboard

2. Test publishing with dry-run:
   ```bash
   npx @raycast/api publish --dry-run
   ```

3. Create and push a version tag to trigger deployment:
   ```bash
   git tag v1.0.1  # Use your actual version number
   git push origin v1.0.1
   ```

4. Monitor deployment:
   - Check GitHub Actions tab for workflow progress
   - Verify extension submission in Raycast Developer Dashboard

## Post-Deployment

1. Monitor for review feedback from the Raycast team
2. Respond to any required changes promptly
3. After approval, verify the extension appears in the Raycast Store

## Troubleshooting

If the GitHub Action fails:
1. Check logs for specific errors
2. Verify your API token is correctly configured
3. Make sure all tests are passing
4. Run the validation locally to identify issues:
   ```bash
   npx @raycast/api lint
   npx @raycast/api publish --dry-run
   ```
