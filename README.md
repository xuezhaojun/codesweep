# CodeSweep

A powerful automation toolkit that leverages AI coding agents to execute tasks across multiple GitHub repositories simultaneously. Supports [Claude Code](https://claude.ai/code) and [OpenCode](https://opencode.ai) as execution agents. Perfect for batch operations, code maintenance, and cross-repository updates. Built with modern JavaScript using [Google Zx](https://github.com/google/zx).

## ✨ Key Features

- 🔄 **Multi-Repository Processing**: Execute tasks across multiple repositories
- ⚡ **Flexible Concurrency**: Control parallelism with `--max-jobs` (1=sequential, >1=parallel)
- 🍴 **Smart Fork Management**: Automatically forks and clones repositories if needed
- 🎯 **Flexible Targeting**: Configure organizations, repositories, and branches with ease
- 📦 **Bundle Support**: Organize task scenarios with predefined target/task combinations
- 🤖 **Multi-Agent Support**: Choose between Claude Code and OpenCode as execution agents
- 📊 **Progress Tracking**: Comprehensive logging and execution summaries
- 🚀 **One-Click Automation**: Generate and run tasks with a single command
- 🌐 **Cross-Platform**: Works on macOS, Linux, and Windows

### Technical Advantages

- **Modern JavaScript**: Clean ES6+ syntax with async/await
- **Modular Architecture**: Separated concerns across multiple modules
- **Better Error Handling**: Try/catch instead of cryptic exit codes
- **Native Data Processing**: Built-in JSON/YAML parsing
- **Improved Concurrency**: Promise-based parallel execution with `p-limit`
- **Colored Output**: Enhanced readability with `chalk`

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 18.0.0 or higher
- [Claude Code CLI](https://claude.ai/code) or [OpenCode CLI](https://opencode.ai) installed and authenticated
- [GitHub CLI (`gh`)](https://cli.github.com/) installed and authenticated

### Installation

```bash
# Clone the repository
git clone git@github.com:stolostron/codesweep.git
cd codesweep

# Install dependencies
npm install

# Verify installation
node --version  # Should be 18.0+
gh auth status
claude --version   # or: opencode --version
```

### Your First Task

```bash
# Create a bundle directory with target.yml and task.md
mkdir -p bundles/my-task
# Add your configuration files to bundles/my-task/

# Generate and execute tasks
npm start -- --bundle bundles/my-task

# Or use zx directly
zx gen-and-run-tasks.mjs --bundle bundles/my-task
```

## 📖 Usage

### Using Zx Directly

```bash
# Basic execution (default: 4 parallel jobs)
zx gen-and-run-tasks.mjs --bundle bundles/my-task

# Sequential execution (one at a time)
zx gen-and-run-tasks.mjs --bundle bundles/my-task --max-jobs 1

# Higher parallelism for faster processing
zx gen-and-run-tasks.mjs --bundle bundles/upgrade-deps --max-jobs 8

# Use OpenCode as execution agent
zx gen-and-run-tasks.mjs --bundle bundles/my-task --agent opencode

# Step-by-step execution
zx gen-and-run-tasks.mjs --bundle bundles/my-task --generate-only
zx gen-and-run-tasks.mjs --bundle bundles/my-task --run-only
```

## ⚙️ Configuration

All tasks are organized using bundles. Each bundle is a self-contained directory with its own configuration.

### Bundle Organization

Organize task scenarios using bundles:

```
bundles/
├── upgrade-deps/
│   ├── target.yml      # Repositories for dependency updates (REQUIRED)
│   ├── task.md         # Dependency upgrade instructions (REQUIRED)
│   ├── GUIDE.md        # Bundle-specific workflow (optional)
│   └── config.json     # Bundle-specific configuration (optional)
├── security-patch/
│   ├── target.yml      # REQUIRED
│   ├── task.md         # REQUIRED
│   ├── GUIDE.md        # optional
│   └── config.json     # optional
└── docs-sync/
    ├── target.yml      # REQUIRED
    ├── task.md         # REQUIRED
    ├── GUIDE.md        # optional
    └── config.json     # optional
```

### Repository Configuration (bundles/*/target.yml)

```yaml
target:
  - org: facebook # GitHub organization
    repos: [react, create-react-app]
    branches: [main, develop]
  - org: microsoft
    repos: [vscode]
    branches: [main]
```

### Task Definition (bundles/*/task.md)

```markdown
# Task Description

Update all package.json files to use Node.js 18 as the minimum version.

## Requirements

- Change "node": ">=16.0.0" to "node": ">=18.0.0"
- Update any related documentation
- Ensure tests still pass
```

### Configuration System

Each bundle can have its own `config.json` to set default behavior:

**Bundle Configuration** (`bundles/scenario/config.json`):

```json
{
  "maxJobs": 4,
  "agent": "claude",
  "guideFile": "GUIDE.md"
}
```

**Configuration Priority**: CLI options > Bundle config > Defaults

## 📋 Command Options

| Option              | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| `--bundle PATH`     | Bundle directory containing target.yml and task.md (REQUIRED)      |
| `--guide-file FILE` | Specify custom guide file (default: GUIDE.md)                      |
| `--generate-only`   | Only generate task files, don't execute them                       |
| `--run-only`        | Execute existing task files without regenerating                   |
| `--max-jobs NUM`    | Concurrency limit (default: 4, use 1 for sequential)              |
| `--agent NAME`      | Execution agent: `claude` or `opencode` (default: `claude`)        |
| `--help, -h`        | Show help message                                                  |

## 📁 Project Structure

```
codesweep/
├── gen-and-run-tasks.mjs   # Main automation script
├── package.json            # Node.js dependencies
├── lib/                    # Core library modules
│   ├── agents/            # Execution agent implementations
│   │   ├── base.mjs       # Base agent interface
│   │   ├── claude.mjs     # Claude Code agent
│   │   ├── opencode.mjs   # OpenCode agent
│   │   └── index.mjs      # Agent factory
│   ├── config.mjs         # Configuration management
│   ├── executor.mjs       # Task execution (agent-agnostic)
│   ├── repository.mjs     # Repository operations
│   ├── taskgen.mjs        # Task file generation
│   └── utils.mjs          # Utility functions
├── GUIDE.md                # Root workflow guidelines (optional)
├── CLAUDE.md               # Project instructions for Claude
├── bundles/                # Task scenario bundles (REQUIRED)
│   ├── upgrade-deps/
│   │   ├── target.yml     # REQUIRED
│   │   ├── task.md        # REQUIRED
│   │   ├── GUIDE.md       # Optional
│   │   └── config.json    # Optional
│   ├── security-patch/
│   └── docs-sync/
├── workspace/              # Auto-managed repository clones
└── tasks/                  # Generated task worktrees
    └── 001_repo_branch/    # Each task is a git worktree
        ├── task.md         # Task instructions
        ├── execution.log   # Execution output
        └── (repo files)    # Full repository code
```

## 🔄 Workflow Examples

### Example 1: Dependency Updates Bundle

Create `bundles/upgrade-deps/target.yml`:

```yaml
target:
  - org: mycompany
    repos: [frontend, backend, mobile-app]
    branches: [main, develop]
```

Create `bundles/upgrade-deps/task.md`:

```markdown
# Update Dependencies

Update all projects to use the latest LTS versions.

## Requirements

- Update package.json/requirements.txt/go.mod
- Run security audit
- Ensure all tests pass
```

Create `bundles/upgrade-deps/config.json` (optional):

```json
{
  "maxJobs": 8
}
```

Execute:

```bash
# Uses bundle config settings
zx gen-and-run-tasks.mjs --bundle bundles/upgrade-deps

# Override config
zx gen-and-run-tasks.mjs --bundle bundles/upgrade-deps --max-jobs 1
```

### Example 2: Security Patch Bundle

```bash
# Execute with bundle config
zx gen-and-run-tasks.mjs --bundle bundles/security-patch

# Override for sequential execution (safer for critical patches)
zx gen-and-run-tasks.mjs --bundle bundles/security-patch --max-jobs 1
```

### Example 3: Documentation Sync

```bash
# Generate and review before execution
zx gen-and-run-tasks.mjs --bundle bundles/docs-sync --generate-only
# Review generated tasks in tasks/ directory
zx gen-and-run-tasks.mjs --run-only
```

## 🛠️ Advanced Usage

### Integration with CI/CD

```bash
# Parallel execution for CI/CD (faster)
zx gen-and-run-tasks.mjs --bundle bundles/my-task --max-jobs 6

# Sequential for safer execution
zx gen-and-run-tasks.mjs --bundle bundles/my-task --max-jobs 1
```

### Custom Guide Files

```bash
# Use organization-specific workflow
zx gen-and-run-tasks.mjs --guide-file guides/company-workflow.md

# Combine bundle with custom guide
zx gen-and-run-tasks.mjs --bundle bundles/upgrade-deps --guide-file guides/security-updates.md
```

### Debugging

Enable verbose output:

```bash
DEBUG=1 zx gen-and-run-tasks.mjs
```

Show all shell commands:

```javascript
// In any .mjs file
$.verbose = true;
```

## 🏗️ Architecture

### Modular Design

```javascript
lib/
├── agents/         # Pluggable execution agents
│   ├── base.mjs    # Base agent interface (detect, buildCommand)
│   ├── claude.mjs  # Claude Code CLI agent
│   ├── opencode.mjs # OpenCode CLI agent
│   └── index.mjs   # Agent factory (createAgent)
├── config.mjs      # Configuration loading and validation
├── utils.mjs       # Formatting, parsing, utility functions
├── repository.mjs  # Git/GitHub repository management
├── taskgen.mjs     # Task file generation from YAML
└── executor.mjs    # Agent-agnostic task execution
```

### Error Handling

```javascript
try {
  await riskyOperation();
} catch (error) {
  console.error("Detailed error:", error.message);
  if (error.stack) console.error(error.stack);
  throw error;
}
```

### Concurrency Control

```javascript
import pLimit from "p-limit";
const limit = pLimit(maxJobs);

const results = await Promise.all(
  tasks.map((task) => limit(() => processTask(task)))
);
```

### Data Processing

```javascript
// Native JSON parsing
const data = JSON.parse(await fs.readFile("file.json"));

// YAML parsing
import YAML from "yaml";
const config = YAML.parse(await fs.readFile("config.yml", "utf8"));
```

## 🚨 Best Practices

1. **Test First**: Start with a small subset of repositories
2. **Use Branches**: Work on feature branches, not main/master
3. **Review Changes**: Always review generated changes before merging
4. **Backup Important**: Keep backups of critical repositories
5. **Monitor Logs**: Use `--save-logs` for debugging and auditing
6. **Organize with Bundles**: Create reusable task scenarios
7. **Version Control Bundles**: Commit bundle configurations for team sharing
8. **Validate Custom Guides**: Ensure guides provide complete automation instructions
9. **Use Parallel Execution**: Enable `--parallel` for faster processing
10. **Tune Concurrency**: Adjust `--max-jobs` based on system resources
11. **Configuration Management**: Use root config for defaults, bundle configs for scenarios
12. **Test Configurations**: Test with small repository sets first

## 📚 Task File Format

Generated task files include:

```markdown
# Task: repo-name/branch-name (from org/repo-name)

## Repository Info

- **Organization**: org-name
- **Repository**: repo-name
- **Branch**: branch-name
- **Workspace Path**: workspace/repo-name

## Guide

<guide>
<!-- Content from GUIDE.md -->
</guide>

## Description

<task>
<!-- Content from task.md -->
</task>
```

## 🔍 Troubleshooting

### "Cannot find module" errors

```bash
npm install
```

### "Permission denied" errors

```bash
chmod +x gen-and-run-tasks.mjs
# or use zx explicitly
zx gen-and-run-tasks.mjs
```

### GitHub authentication issues

```bash
gh auth status
gh auth login
```

## 🤝 Contributing

This tool is designed to be organization-agnostic and can work with any GitHub repositories you have access to. When adding features:

1. Add new modules to `lib/` directory
2. Update this README
3. Test on multiple platforms if possible
4. Keep code modular and maintainable

## 💡 Pro Tips

- **Bundle Organization**: Create bundles for different scenarios (monthly updates, security patches, etc.)
- **Team Sharing**: Commit bundle configurations for consistent task execution
- **Task Automation**: Use for dependency updates, documentation syncing, compliance checks
- **Agent Selection**: Use `--agent opencode` for OpenCode or default to Claude Code
- **Resource Management**: Start with lower `--max-jobs` and increase based on performance
- **Safety First**: Parallel mode prevents Git conflicts by grouping tasks intelligently
- **Configuration Hierarchy**: Root config for defaults, bundle configs for optimizations
- **Smart Defaults**: Conservative root settings, aggressive bundle settings where appropriate
- **Review Workflows**: Set `generateOnly: true` for operations requiring manual review

## 📄 Why Zx?

[Google Zx](https://github.com/google/zx) combines the best of both worlds:

- **Shell scripting power**: Execute shell commands easily with `` $`command` ``
- **JavaScript ecosystem**: Use npm packages, async/await, modern syntax
- **Better error handling**: Try/catch instead of cryptic exit codes
- **Cross-platform**: Works anywhere Node.js runs
- **Maintainability**: Easier to read, test, and extend than shell scripts

## 📖 Documentation

- **Main Documentation**: This file (README.md)
- **Project Instructions**: [CLAUDE.md](CLAUDE.md)
- **Workflow Guide**: [GUIDE.md](GUIDE.md)

---

Built with ❤️ using Google's Zx framework for efficient multi-repository automation.
