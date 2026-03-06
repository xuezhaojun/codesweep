#!/usr/bin/env zx

import { $, fs, path as nodePath } from 'zx';
import { BaseAgent } from './base.mjs';

/**
 * OpenCode CLI agent
 * Executes tasks using: opencode run -f <task-file> "Execute this task" --format default
 */
export class OpenCodeAgent extends BaseAgent {
  constructor() {
    super('opencode');
  }

  async detect() {
    const paths = [
      `${process.env.HOME}/.local/bin/opencode`,
      '/usr/local/bin/opencode',
      '/opt/homebrew/bin/opencode',
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
      const result = await $`bash -ic 'which opencode' 2>/dev/null`.quiet();
      const detectedPath = result.stdout.trim();
      if (detectedPath && await fs.pathExists(detectedPath)) {
        return detectedPath;
      }
    } catch (error) {
      // Continue to fallback
    }

    // Try plain 'which' without interactive shell
    try {
      const result = await $`which opencode 2>/dev/null`.quiet();
      const detectedPath = result.stdout.trim();
      if (detectedPath) {
        return detectedPath;
      }
    } catch (error) {
      // Continue to fallback
    }

    throw new Error(
      'OpenCode CLI not found. Please install it from https://opencode.ai and ensure it is in your PATH.'
    );
  }

  async buildCommand(taskContent, repoCodePath, absoluteLogFile) {
    const agentPath = await this.getPath();
    // Write task content to a temporary file for the -f flag
    const tmpTaskFile = nodePath.join(repoCodePath, '.codesweep-task.md');
    await fs.writeFile(tmpTaskFile, taskContent, 'utf-8');

    return {
      shell: `cd '${repoCodePath}' && '${agentPath}' run -f '${tmpTaskFile}' 'Execute this task' --format default > '${absoluteLogFile}' 2>&1`,
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
