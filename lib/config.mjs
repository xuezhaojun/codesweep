#!/usr/bin/env zx

import { fs, path } from 'zx';
import { isValidAgent, SUPPORTED_AGENTS } from './agents/index.mjs';

/**
 * Default configuration values
 */
const DEFAULT_CONFIG = {
  maxJobs: 4,  // Default concurrency limit (4 parallel jobs)
  generateOnly: false,
  runOnly: false,
  guideFile: 'GUIDE.md',
  agent: 'claude',  // Default execution agent ('claude' or 'opencode')
};

/**
 * Read JSON configuration from a file
 * @param {string} configPath - Path to config file
 * @returns {Object} Parsed configuration or empty object
 */
async function readJsonConfig(configPath) {
  try {
    if (await fs.pathExists(configPath)) {
      const content = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error(`⚠️  Warning: Error reading config file ${configPath}: ${error.message}`);
  }
  return {};
}

/**
 * Load configuration with priority: CLI > Bundle Config > Defaults
 * @param {Object} cliOptions - Command line options
 * @param {string} bundlePath - Bundle directory path (required)
 * @returns {Object} Merged configuration
 */
export async function loadConfig(cliOptions = {}, bundlePath = null) {
  // Start with defaults
  let config = { ...DEFAULT_CONFIG };

  // Load bundle config.json if bundle specified
  if (bundlePath) {
    const bundleConfigPath = path.join(bundlePath, 'config.json');
    const bundleConfig = await readJsonConfig(bundleConfigPath);
    config = { ...config, ...bundleConfig };
  }

  // Apply CLI options (highest priority)
  // Remove undefined values from CLI options
  const filteredCliOptions = Object.fromEntries(
    Object.entries(cliOptions).filter(([_, v]) => v !== undefined)
  );
  config = { ...config, ...filteredCliOptions };

  return config;
}

/**
 * Validate configuration
 * @param {Object} config - Configuration to validate
 * @throws {Error} If configuration is invalid
 */
export function validateConfig(config) {
  // Check for conflicting options
  if (config.generateOnly && config.runOnly) {
    throw new Error('--generate-only and --run-only cannot be used together');
  }

  // Validate maxJobs
  if (!Number.isInteger(config.maxJobs) || config.maxJobs < 1) {
    throw new Error(`--max-jobs must be a positive integer (got: ${config.maxJobs})`);
  }

  // Validate agent
  if (!isValidAgent(config.agent)) {
    throw new Error(`--agent must be one of: ${SUPPORTED_AGENTS.join(', ')} (got: '${config.agent}')`);
  }

  return true;
}

/**
 * Resolve file paths based on bundle configuration
 * @param {string} bundlePath - Bundle directory path (required)
 * @param {string} guideFile - Guide file from config
 * @returns {Object} Resolved file paths
 */
export async function resolveFilePaths(bundlePath, guideFile = 'GUIDE.md') {
  // Bundle path is now required
  if (!bundlePath) {
    throw new Error('Bundle path is required. Please specify a bundle using --bundle option.\nExample: zx gen-and-run-tasks.mjs --bundle bundles/my-task');
  }

  // Validate bundle directory exists
  if (!(await fs.pathExists(bundlePath))) {
    throw new Error(`Bundle directory '${bundlePath}' not found`);
  }

  const paths = {
    targetFile: path.join(bundlePath, 'target.yml'),
    taskFile: path.join(bundlePath, 'task.md'),
    guideFile: guideFile,
    outputDir: 'tasks',
    workspaceDir: 'workspace',
  };

  // Check if bundle has its own GUIDE.md
  const bundleGuide = path.join(bundlePath, 'GUIDE.md');
  if (await fs.pathExists(bundleGuide)) {
    paths.guideFile = bundleGuide;
    paths.bundleGuide = true;
  }

  return paths;
}
