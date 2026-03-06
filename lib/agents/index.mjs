#!/usr/bin/env zx

import { ClaudeAgent } from './claude.mjs';
import { OpenCodeAgent } from './opencode.mjs';

const SUPPORTED_AGENTS = ['claude', 'opencode'];

/**
 * Create an agent instance by name
 * @param {string} name - Agent name ('claude' or 'opencode')
 * @returns {BaseAgent} Agent instance
 */
export function createAgent(name = 'claude') {
  switch (name) {
    case 'claude':
      return new ClaudeAgent();
    case 'opencode':
      return new OpenCodeAgent();
    default:
      throw new Error(
        `Unknown agent: '${name}'. Supported agents: ${SUPPORTED_AGENTS.join(', ')}`
      );
  }
}

/**
 * Validate that an agent name is supported
 * @param {string} name - Agent name to validate
 * @returns {boolean} True if valid
 */
export function isValidAgent(name) {
  return SUPPORTED_AGENTS.includes(name);
}

export { SUPPORTED_AGENTS };
