#!/usr/bin/env zx

/**
 * Base agent interface for CLI execution agents.
 * All agents must implement detect() and buildCommand().
 */
export class BaseAgent {
  constructor(name) {
    this.name = name;
    this._detectedPath = null;
  }

  /**
   * Detect the CLI binary path
   * @returns {Promise<string>} Path to the CLI binary
   * @throws {Error} If the binary cannot be found
   */
  async detect() {
    throw new Error(`${this.name}: detect() not implemented`);
  }

  /**
   * Get the cached CLI path, detecting if needed
   * @returns {Promise<string>} Path to the CLI binary
   */
  async getPath() {
    if (!this._detectedPath) {
      this._detectedPath = await this.detect();
    }
    return this._detectedPath;
  }

  /**
   * Build the shell command string to execute a task
   * @param {string} taskContent - Content of the task file
   * @param {string} repoCodePath - Path to the repository code directory
   * @param {string} absoluteLogFile - Absolute path to the log file
   * @returns {Promise<{cmd: string, args: string[]}>} Command and arguments for execution
   */
  async buildCommand(taskContent, repoCodePath, absoluteLogFile) {
    throw new Error(`${this.name}: buildCommand() not implemented`);
  }
}
