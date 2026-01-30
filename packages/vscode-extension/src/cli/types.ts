/**
 * CLI-specific type definitions
 */

export interface CLICommandOptions {
  /** Working directory for the command */
  cwd?: string;
  /** Timeout in milliseconds */
  timeout?: number;
  /** Environment variables */
  env?: Record<string, string>;
}

export interface CLIInitOptions {
  /** Target path for installation */
  targetPath: string;
  /** Variant to install */
  variant?: 'auto' | 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14';
  /** Skip npm install */
  skipNpm?: boolean;
  /** Skip LLKB initialization */
  skipLlkb?: boolean;
  /** Skip browser installation */
  skipBrowsers?: boolean;
  /** Skip AI prompts installation */
  noPrompts?: boolean;
  /** Force overwrite existing installation */
  force?: boolean;
}

export interface CLIDoctorOptions {
  /** Target path to check */
  targetPath?: string;
  /** Auto-fix issues */
  fix?: boolean;
}

export interface CLIUpgradeOptions {
  /** Target path to upgrade */
  targetPath?: string;
  /** Force upgrade even if already at latest */
  force?: boolean;
}

export interface CLILLKBOptions {
  /** LLKB root directory */
  llkbRoot: string;
}

export interface CLILLKBExportOptions extends CLILLKBOptions {
  /** Output directory */
  outputDir: string;
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Dry run mode */
  dryRun?: boolean;
}

export interface CheckPrerequisitesResult {
  passed: boolean;
  node: {
    found: boolean;
    version?: string;
    meetsMinimum: boolean;
  };
  npm: {
    found: boolean;
    version?: string;
  };
  browsers: {
    chromium?: boolean;
    msedge?: boolean;
    chrome?: boolean;
  };
  issues: string[];
}
