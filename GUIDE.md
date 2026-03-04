# Workflow Guide

## Overview

This guide describes the automated workflow for processing multiple Git repositories, making code changes according to specified tasks, and creating pull requests.

### Workspace Directory

- **`workspace/`**: Contains multiple project directories
  - Each subdirectory is a separate Git repository

## Project Configuration

Each project in the workspace has the following Git remote setup:

```
origin    → User's forked repository
upstream  → Original project repository (PR target)
```

- Default branch: `main` or `master`

## Workflow Process

### 1. Task Initialization

Read the contents of <task>

### 2. Task Processing

#### a. Navigate to Project

```bash
pwd
```

If not in the correct project directory, and there is a `workspace/<project-name>`, change to it:

```bash
cd workspace/<project-name>
```

#### b. Prepare Repository

```bash
# Stash any uncommitted changes
git stash

# Fetch latest changes from all remotes
git fetch --all

# Checkout the specified upstream branch
git checkout upstream/<record.branch>
```

**Note**: Always check out the working branch from the upstream remote, not origin. If the target branch does not exist in the upstream repository, stop the process for this project and report an error.

#### c. Create Feature Branch

**Note:** Always ensure that modifications are made on the target branch specified for the task.

1. Generate a short branch name (max 5 words) based on `task.description`
2. Follow Git branch naming best practices
3. Create and checkout the new branch:

```bash
git checkout -b <task_short_description>-<branch-name>
```

#### d. Execute Task

- Implement code changes according to `task.description`
- Ensure all code comments are in English

#### e. Commit Changes

```bash
# All commits must be signed
git commit -s -m "Your commit message"
```

**Commit Requirements:**

- Use the `-s` flag for signing
- Message must be in English
- Keep messages concise (max 2 sentences)

#### f. Create Pull Request

Use GitHub CLI to create PR from fork to upstream:

```bash
gh pr create \
  --repo <org>/<repo-name> \
  --base <base-branch> \
  --head <github-username>:<branch-name> \
  --title "..." \
  --body $'...'
```

**PR Requirements:**

- Always target the upstream repository
- Default base branch is `main` unless specified
- **PR Title Format**: Before constructing the PR title, check the target repository's `.github` directory for any PR or commit title format requirements:
  1. Check for contributing guidelines: `.github/CONTRIBUTING.md`, `CONTRIBUTING.md`
  2. Check for PR title conventions in: `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.github/PULL_REQUEST_TEMPLATE/`
  3. Check for commit message conventions: `.github/commitlint.config.js`, `.github/commitlint.config.ts`, `commitlint.config.js`, `commitlint.config.ts`, `.commitlintrc.json`, `.commitlintrc.yml`
  4. Check for semantic PR title enforcement: `.github/semantic.yml`, `.github/workflows/` (look for PR title validation steps)
  5. If any format requirements are found (e.g., Conventional Commits like `feat:`, `fix:`, `chore:`), follow that format and **append the branch name in brackets** at the end. For example: `feat: add support for new API endpoint [release-2.1]`
  6. If no specific format requirements are found, use the default format: `<action> <summary> [<branch_name>]`. For example: `Fix dependency vulnerability and update CI config [release-2.1]`
- Description should use markdown format with detailed reasoning
- Use `$'...'` syntax for proper escape sequence handling
- If the target repo has a pull request template, follow it when constructing the PR body.

## Important Notes

### Git Commands

- List branches: `git --no-pager branch`
- Get current username: `git config --get user.name`

### Code Standards

- All code comments must be in English
- Never use non-English characters in code comments

### Error Handling

- If a project fails, mark `pass` as `no` and provide a clear explanation in `result`
- Continue processing remaining projects even if one fails

## Quick Reference

| Action                   | Command                                |
| ------------------------ | -------------------------------------- |
| Stash changes            | `git stash`                            |
| Fetch all remotes        | `git fetch --all`                      |
| Checkout upstream branch | `git checkout upstream/<branch>`       |
| Create feature branch    | `git checkout -b <branch-name>`        |
| Signed commit            | `git commit -s -m "message"`           |
| Create PR                | `gh pr create --repo <org>/<repo> ...` |
