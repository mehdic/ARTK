/**
 * Extension Logger
 *
 * Provides logging utilities for the extension.
 */

import * as vscode from 'vscode';

let _outputChannel: vscode.OutputChannel | undefined;

/**
 * Get the ARTK output channel
 */
export function getOutputChannel(): vscode.OutputChannel {
  if (!_outputChannel) {
    _outputChannel = vscode.window.createOutputChannel('ARTK');
  }
  return _outputChannel;
}

/**
 * Log an info message
 */
export function info(message: string): void {
  const channel = getOutputChannel();
  channel.appendLine(`[INFO] ${new Date().toISOString()} - ${message}`);
}

/**
 * Log a warning message
 */
export function warn(message: string): void {
  const channel = getOutputChannel();
  channel.appendLine(`[WARN] ${new Date().toISOString()} - ${message}`);
}

/**
 * Log an error message
 */
export function error(message: string, err?: Error): void {
  const channel = getOutputChannel();
  channel.appendLine(`[ERROR] ${new Date().toISOString()} - ${message}`);
  if (err) {
    channel.appendLine(`  ${err.message}`);
    if (err.stack) {
      channel.appendLine(`  ${err.stack}`);
    }
  }
}

/**
 * Log a debug message (only in development)
 */
export function debug(message: string): void {
  // Only log debug messages when in development mode
  const channel = getOutputChannel();
  channel.appendLine(`[DEBUG] ${new Date().toISOString()} - ${message}`);
}

/**
 * Show the output channel
 */
export function show(): void {
  getOutputChannel().show();
}

/**
 * Clear the output channel
 */
export function clear(): void {
  getOutputChannel().clear();
}
