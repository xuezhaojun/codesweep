#!/usr/bin/env zx

import { $, fs, path as nodePath } from 'zx';
import { BaseAgent } from './base.mjs';

/**
 * Claude Code CLI agent
 * Executes tasks using: echo <content> | claude -p "Execute this task" --verbose --output-format text --dangerously-skip-permissions
 */
export class ClaudeAgent extends BaseAgent {
  constructor() {
    super('claude');
  }

  async detect() {
    const paths = [
      `${process.env.HOME}/.claude/local/node_modules/.bin/claude`,
      `${process.env.HOME}/.claude/local/claude`,
      `${process.env.HOME}/.local/bin/claude`,
      '/usr/local/bin/claude',
      '/opt/homebrew/bin/claude',
    ];

    for (const p of paths) {
      try {
        if (await fs.pathExists(p)) {
          return p;
        }
      } catch (error) {
        // Continue checking other paths
      }
    }

    // Try using bash -ic to resolve aliases
    try {
      const result = await $`bash -ic 'which claude' 2>/dev/null`.quiet();
      const detectedPath = result.stdout.trim();
      if (detectedPath && await fs.pathExists(detectedPath)) {
        return detectedPath;
      }
    } catch (error) {
      // Continue to fallback
    }

    return 'claude';
  }

  async buildCommand(taskContent, repoCodePath, absoluteLogFile) {
    const agentPath = await this.getPath();
    // Write task content to a temp file to avoid shell escaping issues with large content
    const tmpTaskFile = nodePath.join(repoCodePath, '.codesweep-task.md');
    await fs.writeFile(tmpTaskFile, taskContent, 'utf-8');

    return {
      shell: `cd '${repoCodePath}' && cat '${tmpTaskFile}' | '${agentPath}' -p 'Execute this task' --verbose --output-format text --dangerously-skip-permissions > '${absoluteLogFile}' 2>&1`,
      cleanup: async () => {
        try {
          await fs.remove(tmpTaskFile);
        } catch {
          // Ignore cleanup errors
        }
      },
    };
  }
}
