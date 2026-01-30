/**
 * ARTK VS Code Extension Type Definitions
 */

/**
 * ARTK workspace detection result
 */
export interface ArtkWorkspaceInfo {
  /** Whether ARTK installation was detected */
  detected: boolean;
  /** Root path of the project */
  projectRoot: string;
  /** Path to artk-e2e directory */
  artkE2ePath?: string;
  /** Path to .artk/context.json */
  contextPath?: string;
  /** Path to artk.config.yml */
  configPath?: string;
  /** Installed variant (modern-esm, modern-cjs, legacy-16, legacy-14) */
  variant?: string;
  /** Installed @artk/core version */
  version?: string;
  /** Whether LLKB is enabled */
  llkbEnabled?: boolean;
  /** Path to LLKB directory */
  llkbPath?: string;
}

/**
 * ARTK context.json structure
 */
export interface ArtkContext {
  installedAt: string;
  artkVersion: string;
  variant: string;
  nodeVersion: number;
  moduleSystem: 'esm' | 'cjs';
  playwrightVersion: string;
  browsers?: {
    channel: string;
    strategy: string;
  };
  llkb?: {
    enabled: boolean;
    initializedAt: string;
  };
}

/**
 * ARTK configuration (artk.config.yml)
 */
export interface ArtkConfig {
  app: {
    name: string;
    type?: string;
    description?: string;
  };
  environments: Record<string, {
    baseUrl: string;
    apiUrl?: string;
  }>;
  auth?: {
    provider?: string;
    roles?: string[];
    oidc?: {
      domain?: string;
      clientId?: string;
    };
  };
  browsers?: {
    channel?: string;
    strategy?: string;
    viewport?: {
      width: number;
      height: number;
    };
  };
  tiers?: {
    smoke?: { timeout?: number };
    release?: { timeout?: number };
    regression?: { timeout?: number };
  };
  selectors?: {
    testIdAttribute?: string;
    strategy?: string[];
  };
}

/**
 * Journey frontmatter
 */
export interface JourneyFrontmatter {
  id: string;
  title: string;
  status: 'proposed' | 'defined' | 'clarified' | 'implemented' | 'quarantined' | 'deprecated';
  tier: 'smoke' | 'release' | 'regression';
  actor?: string;
  scope?: string;
  owner?: string;
  statusReason?: string;
  tests?: string[];
  links?: {
    issues?: string[];
    prd?: string;
    design?: string;
  };
}

/**
 * Journey item for tree view
 */
export interface JourneyItem {
  id: string;
  title: string;
  status: JourneyFrontmatter['status'];
  tier: JourneyFrontmatter['tier'];
  filePath: string;
  tests?: string[];
  owner?: string;
}

/**
 * LLKB health check result
 */
export interface LLKBHealthResult {
  healthy: boolean;
  issues: string[];
  stats: {
    lessonsCount: number;
    componentsCount: number;
    lastUpdated?: string;
  };
}

/**
 * LLKB statistics
 */
export interface LLKBStats {
  lessons: {
    total: number;
    active: number;
    byCategory: Record<string, number>;
  };
  components: {
    total: number;
    active: number;
    topUsed: Array<{ id: string; name: string; usageCount: number }>;
  };
  analytics: {
    totalLearningEvents: number;
    lastUpdated: string;
  };
}

/**
 * CLI execution result
 */
export interface CLIResult<T = string> {
  success: boolean;
  data?: T;
  error?: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

/**
 * Doctor diagnostic result
 */
export interface DiagnosticResult {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  fix?: string;
}

/**
 * Init wizard options
 */
export interface InitOptions {
  targetPath: string;
  variant?: 'auto' | 'modern-esm' | 'modern-cjs' | 'legacy-16' | 'legacy-14';
  skipNpm?: boolean;
  skipLlkb?: boolean;
  skipBrowsers?: boolean;
  noPrompts?: boolean;
  force?: boolean;
}
