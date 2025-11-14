#!/usr/bin/env zx

import chalk from 'chalk';

/**
 * Format timestamp in human readable format
 * @returns {string} Formatted timestamp
 */
export function formatTimestamp() {
  const now = new Date();
  return now.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Calculate duration between two timestamps
 * @param {number} startTime - Start time in milliseconds
 * @param {number} endTime - End time in milliseconds
 * @returns {number} Duration in seconds
 */
export function calculateDuration(startTime, endTime) {
  return Math.floor((endTime - startTime) / 1000);
}

/**
 * Format duration in human readable format
 * @param {number} durationSeconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export function formatDuration(durationSeconds) {
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const seconds = durationSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Print section header
 * @param {string} title - Section title
 */
export function printHeader(title) {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════════════════════');
  console.log(chalk.bold(title));
  console.log('═══════════════════════════════════════════════════════════════════════════════════');
  console.log('');
}

/**
 * Print usage information
 */
export function printUsage() {
  console.log('');
  console.log('🚀 ═══════════════════════════════════════════════════════════════════════════════════');
  console.log('🤖 CLAUDE MULTI-REPO AGENT (Zx Edition)');
  console.log('═══════════════════════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('📋 Usage: zx gen-and-run-tasks.mjs --bundle BUNDLE_PATH [OPTIONS]');
  console.log('   or:    npm start -- --bundle BUNDLE_PATH [OPTIONS]');
  console.log('');
  console.log('⚙️  Required:');
  console.log('  📦 --bundle PATH       Bundle directory containing target.yml and task.md (REQUIRED)');
  console.log('');
  console.log('⚙️  Optional:');
  console.log('  📝 --guide-file FILE   Specify custom guide file (default: GUIDE.md or from config)');
  console.log('  📝 --generate-only     Only generate task files, don\'t run them');
  console.log('  ▶️  --run-only         Only run existing task files (skip generation)');
  console.log('  ⚙️  --max-jobs NUM     Concurrency limit (default: 4, use 1 for sequential execution)');
  console.log('  ❓ --help, -h          Show this help message');
  console.log('');
  console.log('📦 Bundle structure:');
  console.log('  bundles/my-task/');
  console.log('  ├── target.yml         Repository and branch configuration (REQUIRED)');
  console.log('  ├── task.md            Task description and requirements (REQUIRED)');
  console.log('  ├── GUIDE.md           Bundle-specific workflow instructions (optional)');
  console.log('  └── config.json        Bundle-specific configuration (optional)');
  console.log('');
  console.log('💡 Examples:');
  console.log('  zx gen-and-run-tasks.mjs --bundle bundles/upgrade-deps');
  console.log('  npm start -- --bundle bundles/security-patch --max-jobs 8');
  console.log('  zx gen-and-run-tasks.mjs --bundle bundles/docs-sync --generate-only');
  console.log('  zx gen-and-run-tasks.mjs --bundle bundles/my-task --max-jobs 1  # Sequential');
  console.log('');
  console.log('🔄 Priority: Command line options > Bundle config > Defaults');
  console.log('🎯 Default behavior: Generate and run tasks with concurrency limit of 4');
  console.log('🚀 Concurrency: Uses git worktrees for true parallelization');
  console.log('   Each task runs in its own worktree, enabling same-repo different-branch parallel execution');
  console.log('═══════════════════════════════════════════════════════════════════════════════════');
  console.log('');
}

/**
 * Parse command line arguments (simplified - zx provides argv)
 * @param {Object} argv - Arguments from zx
 * @returns {Object} Parsed options
 */
export function parseArguments(argv) {
  const options = {
    bundle: argv.bundle,
    guideFile: argv['guide-file'],
    generateOnly: argv['generate-only'],
    runOnly: argv['run-only'],
    maxJobs: argv['max-jobs'] ? parseInt(argv['max-jobs']) : undefined,
    help: argv.help || argv.h,
  };

  return options;
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 5)
 * @param {number} options.initialDelay - Initial delay in milliseconds (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in milliseconds (default: 30000)
 * @param {string} options.operationName - Name of the operation for logging (default: 'Operation')
 * @returns {Promise<any>} Result from the function
 * @throws {Error} Last error if all retries fail
 */
export async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 5,
    initialDelay = 1000,
    maxDelay = 30000,
    operationName = 'Operation'
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        console.error(`   ❌ ${operationName} failed after ${maxRetries + 1} attempts`);
        throw lastError;
      }

      // Calculate exponential backoff delay
      const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
      const retryNumber = attempt + 1;
      const remainingRetries = maxRetries - attempt;

      console.log(`   ⚠️  ${operationName} failed (attempt ${retryNumber}/${maxRetries + 1})`);
      console.log(`   🔄 Retrying in ${(delay / 1000).toFixed(1)}s... (${remainingRetries} retries remaining)`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

