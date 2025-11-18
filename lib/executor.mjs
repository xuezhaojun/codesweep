#!/usr/bin/env zx

import { $, fs, path, chalk } from 'zx';
import pLimit from 'p-limit';
import { formatTimestamp, calculateDuration, formatDuration } from './utils.mjs';

/**
 * Detect Claude CLI path by checking common locations
 * @returns {string} Path to Claude CLI binary
 */
async function detectClaudePath() {
  // Common paths to check
  const paths = [
    // User's home directory installations
    `${process.env.HOME}/.claude/local/node_modules/.bin/claude`,
    `${process.env.HOME}/.claude/local/claude`,
    // NPM global installations
    `${process.env.HOME}/.local/bin/claude`,
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    // Try using 'which' command with interactive shell to pick up aliases
  ];

  // Check file-based paths first
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

  // Fallback: just use 'claude' and hope it's in PATH
  return 'claude';
}

// Cache the detected claude path
let claudePath = null;

/**
 * Extract repository paths from task file
 * @param {string} taskFile - Path to task file
 * @returns {Object} Object with taskDirPath and repoCodePath
 */
async function extractRepoPaths(taskFile) {
  const content = await fs.readFile(taskFile, 'utf-8');

  // Extract task directory path
  const taskDirMatch = content.match(/^- \*\*Task Directory\*\*: (.+)$/m);
  if (!taskDirMatch) {
    throw new Error('Could not extract task directory from task file');
  }

  // Extract repository code path (worktree subdirectory)
  const repoCodeMatch = content.match(/^- \*\*Repository Code\*\*: (.+)$/m);
  if (!repoCodeMatch) {
    throw new Error('Could not extract repository code path from task file');
  }

  return {
    taskDirPath: taskDirMatch[1].trim(),
    repoCodePath: repoCodeMatch[1].trim(),
  };
}

/**
 * Run a single task
 * @param {string} taskFile - Path to task file
 * @param {string} logFile - Path to log file
 * @returns {Object} Task result {success, duration, startTime, endTime}
 */
export async function runTask(taskFile, logFile) {
  // Extract task name from directory name (parent of task.md)
  const taskDir = path.dirname(taskFile);
  const taskName = path.basename(taskDir);
  const startTimestamp = formatTimestamp();
  const startTime = Date.now();

  console.log('');
  console.log(`🚀 Processing: ${taskName}`);
  console.log(`🕰️  Started at: ${startTimestamp}`);

  try {
    // Detect Claude CLI path if not cached
    if (!claudePath) {
      claudePath = await detectClaudePath();
      console.log(`🔍 Detected Claude CLI at: ${claudePath}`);
    }

    // Extract repository paths
    const { taskDirPath, repoCodePath } = await extractRepoPaths(taskFile);

    if (!(await fs.pathExists(repoCodePath))) {
      throw new Error(`Repository code directory does not exist: ${repoCodePath}`);
    }

    console.log(`📁 Task directory: ${taskDirPath}`);
    console.log(`📁 Working in repository code: ${repoCodePath}`);

    // Run Claude CLI with output saved to log
    console.log(`🤖 Running Claude CLI... (output saved to log)`);
    const taskContent = await fs.readFile(taskFile, 'utf-8');

    // Ensure log file directory exists before writing (should be task directory)
    await fs.ensureDir(path.dirname(logFile));

    // Convert log file to absolute path for use in subshell
    const absoluteLogFile = path.resolve(logFile);

    try {
      // Run claude command in repo code directory and save output to task directory
      // Use detected claude path to avoid alias issues in non-interactive shells
      await $`cd ${repoCodePath} && echo ${taskContent} | ${claudePath} -p "Execute this task" --verbose --output-format text --dangerously-skip-permissions > ${absoluteLogFile} 2>&1`;
    } catch (error) {
      // Command failed, but output was saved to log
      const endTimestamp = formatTimestamp();
      const endTime = Date.now();
      const duration = calculateDuration(startTime, endTime);
      const formattedDuration = formatDuration(duration);

      console.log(`🏁 Finished at: ${endTimestamp}`);
      console.log(`⏱️  Duration: ${formattedDuration}`);
      console.log(`❌ Failed: ${taskName}`);
      console.log(`📄 Log: ${logFile}`);

      return {
        success: false,
        taskName,
        startTimestamp,
        endTimestamp,
        duration,
        formattedDuration,
        logFile,
      };
    }

    const endTimestamp = formatTimestamp();
    const endTime = Date.now();
    const duration = calculateDuration(startTime, endTime);
    const formattedDuration = formatDuration(duration);

    console.log(`🏁 Finished at: ${endTimestamp}`);
    console.log(`⏱️  Duration: ${formattedDuration}`);
    console.log(`✅ Completed: ${taskName}`);
    console.log(`📄 Log: ${logFile}`);

    return {
      success: true,
      taskName,
      startTimestamp,
      endTimestamp,
      duration,
      formattedDuration,
      logFile,
    };
  } catch (error) {
    const endTimestamp = formatTimestamp();
    const endTime = Date.now();
    const duration = calculateDuration(startTime, endTime);
    const formattedDuration = formatDuration(duration);

    console.log(`🏁 Finished at: ${endTimestamp}`);
    console.log(`⏱️  Duration: ${formattedDuration}`);
    console.log(`❌ Failed: ${taskName} - ${error.message}`);

    return {
      success: false,
      taskName,
      startTimestamp,
      endTimestamp,
      duration,
      formattedDuration,
      error: error.message,
    };
  }
}


/**
 * Execute tasks with concurrency control using git worktrees
 * Logs are saved to execution.log in each task directory
 * @param {string[]} taskFiles - Array of task file paths
 * @param {number} maxJobs - Maximum concurrent jobs
 * @returns {Object} Execution results {successful, failed, results}
 */
export async function executeWithConcurrency(taskFiles, maxJobs = 4) {
  if (maxJobs === 1) {
    console.log(`🔄 Running in sequential mode (concurrency limit: 1)`);
  } else {
    console.log(`🚀 Running with concurrency limit: ${maxJobs} parallel tasks`);
    console.log(`🌲 Using git worktrees for true parallelization across all tasks`);
  }

  // Create concurrency limiter
  const limit = pLimit(maxJobs);

  // Track all results
  const allResults = [];
  let successful = 0;
  let failed = 0;

  // Process all tasks with concurrency limit
  const taskPromises = taskFiles.map((taskFile) => {
    return limit(async () => {
      const taskDir = path.dirname(taskFile);
      const taskName = path.basename(taskDir);
      const logFile = path.join(taskDir, 'execution.log');

      console.log(`🚀 Starting task: ${taskName}`);

      const result = await runTask(taskFile, logFile);

      if (result.success) {
        successful++;
        console.log(`✅ Task completed: ${taskName}`);
      } else {
        failed++;
        console.log(`❌ Task failed: ${taskName}`);
      }

      return result;
    });
  });

  // Wait for all tasks to complete
  console.log(`⏳ Waiting for all ${taskFiles.length} tasks to complete...`);
  const results = await Promise.all(taskPromises);
  allResults.push(...results);

  console.log('🎉 All tasks completed');

  // Print results summary
  console.log('');
  console.log('📊 EXECUTION RESULTS');
  console.log('════════════════════════════════════════');

  for (const result of allResults) {
    if (result.success) {
      console.log(`✅ ${result.taskName} (${result.formattedDuration}) - 📄 Log: ${result.logFile}`);
    } else {
      console.log(`❌ ${result.taskName} (${result.formattedDuration}) - 📄 Log: ${result.logFile || 'N/A'}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  console.log('');
  console.log(`📊 Result summary: ${successful} successful, ${failed} failed (total processed: ${allResults.length})`);

  return { successful, failed, results: allResults };
}

/**
 * Execute all tasks
 * Logs are saved to execution.log in each task directory
 * @param {string} outputDir - Output directory containing task files
 * @param {Object} config - Configuration object
 * @returns {Object} Execution results {successful, failed, totalTasks}
 */
export async function executeTasks(outputDir, config) {
  // Check if tasks directory exists
  if (!(await fs.pathExists(outputDir))) {
    throw new Error(`${outputDir} directory not found. Please ensure task generation was successful`);
  }

  // Get all task.md files from subdirectories
  const allItems = await fs.readdir(outputDir);
  const taskFiles = [];

  for (const item of allItems) {
    const itemPath = path.join(outputDir, item);
    const stats = await fs.stat(itemPath);

    if (stats.isDirectory()) {
      const taskFilePath = path.join(itemPath, 'task.md');
      if (await fs.pathExists(taskFilePath)) {
        taskFiles.push(taskFilePath);
      }
    }
  }

  taskFiles.sort();

  if (taskFiles.length === 0) {
    throw new Error(`No task.md files found in ${outputDir}. Please ensure task generation was successful`);
  }

  console.log(`📁 Found ${taskFiles.length} task directories to process`);

  const executionStartTimestamp = formatTimestamp();
  const executionStartTime = Date.now();

  console.log('🚀 Starting task execution...');
  console.log(`🕰️  Execution started at: ${executionStartTimestamp}`);
  console.log(`📁 Logs will be saved to execution.log in each task directory`);

  // Execute all tasks with concurrency control
  const result = await executeWithConcurrency(taskFiles, config.maxJobs);

  const executionEndTimestamp = formatTimestamp();
  const executionEndTime = Date.now();
  const totalDuration = calculateDuration(executionStartTime, executionEndTime);
  const formattedTotalDuration = formatDuration(totalDuration);

  return {
    successful: result.successful,
    failed: result.failed,
    totalTasks: taskFiles.length,
    startTimestamp: executionStartTimestamp,
    endTimestamp: executionEndTimestamp,
    duration: formattedTotalDuration,
    outputDir: outputDir,
  };
}
