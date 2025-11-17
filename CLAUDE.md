# CodeSweep

This project provides an automated system for executing Claude Code tasks across multiple GitHub repositories simultaneously.

## Project Overview

**CodeSweep** is a universal automation toolkit that:
- Executes tasks across multiple GitHub repositories and branches
- **Uses git worktrees for true parallel execution** - even same repo, different branches can run concurrently
- Automatically manages repository forks and clones
- Organizes task scenarios using predefined bundles
- Creates isolated worktree environments for each task
- Leverages Claude Code for intelligent task execution
- Built with modern JavaScript using Google's Zx framework

## Key Components

### Main Script
- **Main script**: `gen-and-run-tasks.mjs`
- **Requirements**: Node.js 18+, `gh` CLI, `claude` CLI
- **Built-in features**: YAML/JSON parsing, colored output, intelligent concurrency control
- **Documentation**: See [README-ZX.md](README-ZX.md), [QUICKSTART-ZX.md](QUICKSTART-ZX.md)

### Bundle Organization
All tasks are organized using bundles. Each bundle is a directory containing:
- `bundles/`: Directory containing task scenario bundles
  - `bundles/scenario-name/target.yml`: Repository and branch configuration (REQUIRED)
  - `bundles/scenario-name/task.md`: Task description and requirements (REQUIRED)
  - `bundles/scenario-name/GUIDE.md`: Bundle-specific workflow instructions (optional)
  - `bundles/scenario-name/config.json`: Bundle-specific configuration overrides (optional)
- Examples: `bundles/upgrade-deps/`, `bundles/security-patch/`, `bundles/docs-sync/`

### Configuration Files
- `GUIDE.md`: Root-level workflow instructions (used when bundle doesn't have its own GUIDE.md)

### Directory Structure
- `bundles/`: Task scenario bundles (each bundle contains target.yml, task.md, etc.)
- `workspace/`: Auto-managed bare repository clones (used as base for worktree creation)
- `tasks/`: Generated task directories (format: `001_repo_branch/`)
  - Each task directory contains:
    - `<repo-name>/`: Git worktree with repository code on the specified branch
    - `task.md`: Task instructions and metadata at the root level
    - `execution.log`: Claude Code execution output at the root level

## Configuration Format

### target.yml Structure
```yaml
target:
  - org: organization-name    # GitHub organization
    repos: [repo1, repo2]     # Repository names
    branches: [main, develop] # Target branches
```

### Bundle Structure
Each bundle is a directory containing:
```
bundles/scenario-name/
├── target.yml    # Bundle-specific repository and branch configuration
├── task.md       # Bundle-specific task description and requirements
├── GUIDE.md      # Bundle-specific workflow instructions (optional)
└── config.json   # Bundle-specific configuration overrides (optional)
```

### Task Worktree Structure
Each generated task directory contains:
```
tasks/001_repo_branch/
├── <repo-name>/           # Repository code in git worktree subdirectory
│   ├── .git               # Git worktree metadata
│   ├── go.mod, main.go    # All repository files
│   └── ...
├── task.md                # Task description and metadata (at root)
└── execution.log          # Claude execution output (at root)
```

**Structure explanation:**
- **Task Directory**: Parent directory (tasks/001_repo_branch/)
- **Repository Subdirectory**: Git worktree with repository code
- **task.md**: Contains repository metadata, workflow guide, and task description
  - Repository metadata (org, repo, branch, task directory, repository code path)
  - Workflow guide (from bundle's GUIDE.md if available, otherwise root GUIDE.md)
  - Task description (from bundle's task.md)
- **execution.log**: Claude Code execution output (created after task execution)

## Automation Workflow

1. **Repository Setup**: Automatically forks and clones repositories if not present in workspace
   - **Bare clone** (no working directory) to support git worktrees
   - All branches available for worktree creation
   - Fetches latest branches from all remotes
2. **Worktree Generation**: Creates isolated git worktrees for each org/repo/branch combination
   - Creates task directory first
   - Creates git worktree in a subdirectory named after the repository
   - Each worktree is an independent working directory
   - Worktrees share the git metadata from the bare repository
   - Generates task.md file at task directory root level (outside worktree)
3. **Task Execution**: Runs Claude Code in each repository subdirectory with configurable concurrency
   - **Concurrency Control**: Use `--max-jobs N` to control parallelism (default: 4)
   - **Sequential Mode**: Set `--max-jobs 1` for one-by-one execution
   - **Parallel Mode**: **All tasks can run concurrently** - no repo-level restrictions
4. **Progress Tracking**: Provides execution summaries and automatic logging

### Git Worktree Architecture

- **Bare Repository Base**: Workspace contains bare clones (no working directory)
- **True Parallelization**: Each task runs in its own git worktree
- **Same-Repo, Different-Branch**: Can execute concurrently without conflicts
- **Isolated Environments**: Each worktree has independent working files
- **Shared Git Metadata**: All worktrees share the same bare repository (efficient storage)
- **No Branch Conflicts**: Bare repository doesn't occupy any branch
- **Manual Recovery**: Failed tasks can be manually fixed by cd'ing into the worktree directory
- **Flexible Concurrency**: Control parallelism with `--max-jobs` (1 = sequential, >1 = parallel)

## Usage Patterns

### Quick Start

```bash
zx gen-and-run-tasks.mjs --bundle bundles/my-task
# or using npm
npm start -- --bundle bundles/my-task
```

### Basic Workflow

```bash
# Default: runs with concurrency limit of 4
zx gen-and-run-tasks.mjs --bundle bundles/upgrade-deps

# Sequential execution (one task at a time)
zx gen-and-run-tasks.mjs --bundle bundles/security-patch --max-jobs 1

# Higher parallelism for faster processing
zx gen-and-run-tasks.mjs --bundle bundles/docs-sync --max-jobs 8
```

### Advanced Options

```bash
# Generate task files only (no execution)
zx gen-and-run-tasks.mjs --bundle bundles/my-task --generate-only

# Execute existing task files (skip generation)
zx gen-and-run-tasks.mjs --bundle bundles/my-task --run-only

# Custom guide file
zx gen-and-run-tasks.mjs --bundle bundles/my-task --guide-file custom-guide.md

# Control concurrency (1 = sequential, higher = more parallel)
zx gen-and-run-tasks.mjs --bundle bundles/my-task --max-jobs 8
```

## Manual Intervention Workflow

One of the key benefits of the worktree architecture is the ability to manually fix failed tasks:

### When a Task Fails

1. **Navigate to the task directory**:
   ```bash
   cd tasks/001_repo_branch
   ```

2. **Check the log file** to understand what went wrong:
   ```bash
   cat execution.log
   ```

3. **Navigate to the repository code**:
   ```bash
   cd <repo-name>  # e.g., cd cluster-proxy-addon
   ```

4. **Fix the issue manually**:
   - The repository subdirectory contains the full code on the correct branch
   - Make any necessary changes
   - Run git commands as needed
   - Test your changes

5. **Continue or re-run**:
   - Option A: Continue manually with git commit and PR creation
     ```bash
     git add .
     git commit -s -m "Fix issue"
     gh pr create ...
     ```
   - Option B: Re-run Claude Code:
     ```bash
     # Go back to task directory
     cd ..
     # Re-run with task.md
     cat task.md | claude -p "Execute this task" > execution.log 2>&1
     ```

### Benefits

- **Traceability**: All task state is preserved in the task directory
- **Clean Separation**: Task metadata and repository code are clearly separated
- **Flexibility**: Can switch between automated and manual workflows
- **Debugging**: Easy to inspect logs and modify code independently
- **No conflicts**: Each task has its own isolated environment

## Git Integration

The system automatically:
- Checks for existing repository forks
- Creates forks if needed using GitHub CLI
- Clones forked repositories to workspace as **bare repositories** for worktree support
- Fetches latest branches from all remotes
- Sets up upstream remotes for PR workflows
- Creates git worktrees for isolated task execution
- Handles multiple organizations and repositories

## Configuration System

### Bundle Files

Bundles can include any combination of these files:
- `target.yml` (required): Repository and branch configuration
- `task.md` (required): Task description and requirements
- `GUIDE.md` (optional): Bundle-specific workflow instructions
- `config.json` (optional): Bundle-specific configuration

### Configuration Schema

```json
{
  "maxJobs": 4,
  "generateOnly": false,
  "runOnly": false,
  "guideFile": "GUIDE.md"
}
```

### Configuration Priority

The system applies configuration in this priority order:
1. **Command line options** (highest priority)
2. **Bundle-specific config.json**
3. **Built-in defaults** (lowest priority)

### Example

**Bundle Configuration** (`bundles/security-patch/config.json`):
```json
{
  "maxJobs": 8
}
```

With this config, running `--bundle bundles/security-patch` would use:
- `maxJobs: 8` (from bundle config)
- Command line options would override any of these
- Any unspecified options use built-in defaults
- Execution logs are always saved to `execution.log` in each task directory

## Requirements

- **Claude Code CLI** (authenticated) - `claude --version`
- **GitHub CLI** `gh` (authenticated) - `gh auth status`
- **Node.js** 18.0.0 or higher - `node --version`
- **NPM** 9.0.0 or higher - `npm --version`
- **Dependencies**: Auto-installed via `npm install`
  - `zx` - Google Zx framework
  - `yaml` - YAML parsing
  - `chalk` - Colored output
  - `p-limit` - Concurrency control

## Getting Started

```bash
# Check requirements
node --version  # Should be 18.0+
gh auth status
claude --version

# Install dependencies (first time only)
npm install

# Create your first bundle
mkdir -p bundles/my-task
# Add target.yml and task.md to the bundle directory

# Run your first task
zx gen-and-run-tasks.mjs --bundle bundles/my-task
# or
npm start -- --bundle bundles/my-task
```

## Documentation

- **Main Documentation**: This file (CLAUDE.md)
- **User Guide**: [README-ZX.md](README-ZX.md)
- **Quick Start**: [QUICKSTART-ZX.md](QUICKSTART-ZX.md)
- **Technical Details**: [ZX-IMPLEMENTATION-SUMMARY.md](ZX-IMPLEMENTATION-SUMMARY.md)
- **File Extension Explained**: [MJS-vs-JS-EXPLAINED.md](MJS-vs-JS-EXPLAINED.md)

## Bundle Examples

### Common Bundle Scenarios

1. **Dependency Updates** (`bundles/upgrade-deps/`)
   - Target: Development repositories across multiple organizations
   - Task: Update package.json, requirements.txt, go.mod, etc.

2. **Security Patches** (`bundles/security-patch/`)
   - Target: Production and security-critical repositories
   - Task: Apply CVE fixes and security updates

3. **Documentation Sync** (`bundles/docs-sync/`)
   - Target: Documentation repositories and websites
   - Task: Synchronize content, update links, standardize formatting

4. **Compliance Updates** (`bundles/compliance/`)
   - Target: All organizational repositories
   - Task: Update license headers, add security policies, standardize configurations

---

This tool is designed for batch operations like dependency updates, security patches, documentation synchronization, and configuration standardization across repository ecosystems. All tasks are organized using bundles for better organization, reusability, and maintainability.

Built with modern JavaScript using Google's Zx framework for maintainability, cross-platform compatibility, and excellent developer experience.