#!/usr/bin/env zx

import { $, fs, path, chalk } from 'zx';
import { retryWithBackoff } from './utils.mjs';

/**
 * Get current GitHub username
 * @returns {string} GitHub username
 */
export async function getCurrentGitHubUser() {
  try {
    const result = await $`gh api user --jq '.login'`;
    return result.stdout.trim();
  } catch (error) {
    const errorMsg = error.stderr || error.message || 'Unknown error';
    console.error(`   ❌ Error: Could not get current GitHub user. Please check gh authentication.`);
    console.error(`   📋 GitHub API error details:`);
    console.error(`      ${errorMsg}`);
    throw new Error('Could not get current GitHub user. Please check gh authentication.');
  }
}

/**
 * Check if user has forked a repository
 * @param {string} username - GitHub username
 * @param {string} repo - Repository name
 * @returns {boolean} True if fork exists
 */
export async function hasFork(username, repo) {
  try {
    const result = await $`gh repo list ${username} --fork --json name --jq '.[].name'`;
    const repos = result.stdout.trim().split('\n');
    return repos.includes(repo);
  } catch (error) {
    return false;
  }
}

/**
 * Create a fork of a repository
 * @param {string} org - Organization name
 * @param {string} repo - Repository name
 * @returns {boolean} True if successful
 */
export async function createFork(org, repo) {
  try {
    console.log(`   🍴 Creating fork of ${org}/${repo}...`);
    await $`gh repo fork ${org}/${repo} --clone=false`;
    console.log(`   ✅ Successfully forked ${org}/${repo}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error: Failed to fork ${org}/${repo}`);
    return false;
  }
}

/**
 * Clone a repository as bare repository (required for worktree support)
 * @param {string} username - GitHub username
 * @param {string} repo - Repository name
 * @param {string} repoDir - Local directory path
 * @returns {boolean} True if successful
 */
export async function cloneRepository(username, repo, repoDir) {
  try {
    console.log(`   📥 Cloning ${username}/${repo} as bare repository for worktree support...`);

    await retryWithBackoff(
      async () => {
        await $`git clone --bare https://github.com/${username}/${repo}.git ${repoDir}`;
      },
      {
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        operationName: `Cloning ${username}/${repo}`
      }
    );

    console.log(`   ✅ Successfully cloned ${username}/${repo}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error: Failed to clone ${username}/${repo} after all retry attempts`);
    console.error(`   📋 Error details: ${error.message || error}`);
    return false;
  }
}

/**
 * Configure upstream remote for a repository
 * @param {string} repoDir - Local repository directory
 * @param {string} org - Organization name
 * @param {string} repo - Repository name
 * @returns {boolean} True if successful
 */
export async function configureUpstream(repoDir, org, repo) {
  const upstreamUrl = `https://github.com/${org}/${repo}.git`;

  try {
    console.log(`   🔗 Configuring upstream remote to ${org}/${repo}...`);

    // Check if upstream remote exists
    let hasUpstream = false;
    try {
      await $`git -C ${repoDir} remote get-url upstream`;
      hasUpstream = true;
    } catch (error) {
      hasUpstream = false;
    }

    if (hasUpstream) {
      console.log(`   🔄 Upstream remote exists, updating to ${upstreamUrl}`);
      await $`git -C ${repoDir} remote set-url upstream ${upstreamUrl}`;
    } else {
      console.log(`   ➕ Adding upstream remote ${upstreamUrl}`);
      await $`git -C ${repoDir} remote add upstream ${upstreamUrl}`;
    }

    return true;
  } catch (error) {
    console.error(`   ❌ Error: Failed to configure upstream remote`);
    return false;
  }
}

/**
 * Update upstream remote if organization changed
 * @param {string} repoDir - Local repository directory
 * @param {string} org - Organization name
 * @param {string} repo - Repository name
 * @returns {boolean} True if successful
 */
export async function updateUpstreamRemote(repoDir, org, repo) {
  try {
    console.log(`   🔗 Verifying upstream remote for ${org}/${repo}...`);

    let currentUpstream = '';
    try {
      const result = await $`git -C ${repoDir} remote get-url upstream`;
      currentUpstream = result.stdout.trim();
    } catch (error) {
      // No upstream remote
    }

    const expectedUpstream = `https://github.com/${org}/${repo}.git`;

    if (currentUpstream !== expectedUpstream) {
      console.log(`   🔄 Updating upstream from ${currentUpstream} to ${expectedUpstream}`);
      if (currentUpstream) {
        await $`git -C ${repoDir} remote set-url upstream ${expectedUpstream}`;
      } else {
        await $`git -C ${repoDir} remote add upstream ${expectedUpstream}`;
      }
    } else {
      console.log(`   ✅ Upstream remote already correct: ${expectedUpstream}`);
    }

    return true;
  } catch (error) {
    console.error(`   ❌ Error: Failed to update upstream remote`);
    return false;
  }
}

/**
 * Fetch latest branches from all remotes
 * @param {string} repoDir - Local repository directory
 * @returns {boolean} True if successful
 */
export async function fetchLatestBranches(repoDir) {
  try {
    console.log(`   🔄 Fetching latest branches from all remotes...`);
    await $`git -C ${repoDir} fetch --all`;
    console.log(`   ✅ Successfully fetched latest branches`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error: Failed to fetch latest branches`);
    return false;
  }
}

/**
 * Ensure repository exists in workspace (always uses full clone for worktree support)
 * @param {string} org - Organization name
 * @param {string} repo - Repository name
 * @param {string} workspaceDir - Workspace directory path
 * @returns {boolean} True if successful
 */
export async function ensureRepoExists(org, repo, workspaceDir) {
  const repoDir = path.join(workspaceDir, repo);

  // Check if repository already exists
  if (await fs.pathExists(repoDir)) {
    console.log(`   ✅ Repository ${repo} already exists in workspace`);
    await updateUpstreamRemote(repoDir, org, repo);
    await fetchLatestBranches(repoDir);
    return true;
  }

  console.log(`   🔍 Repository ${repo} not found in workspace, checking for fork...`);

  // Get current GitHub username
  const currentUser = await getCurrentGitHubUser();

  // Check if fork exists, create if not
  const forkExists = await hasFork(currentUser, repo);
  if (!forkExists) {
    const created = await createFork(org, repo);
    if (!created) {
      return false;
    }
  } else {
    console.log(`   ✅ Fork ${currentUser}/${repo} already exists`);
  }

  // Clone the repository (always full clone for worktree support)
  const cloned = await cloneRepository(currentUser, repo, repoDir);
  if (!cloned) {
    return false;
  }

  // Configure upstream remote
  const configured = await configureUpstream(repoDir, org, repo);
  if (!configured) {
    return false;
  }

  // Fetch latest branches
  await fetchLatestBranches(repoDir);

  console.log(`   ✅ Successfully set up repository ${repo} in workspace`);
  return true;
}
