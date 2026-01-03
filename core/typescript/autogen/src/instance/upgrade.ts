import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

// Get CURRENT_CONFIG_VERSION - this should eventually come from config schema
const CURRENT_CONFIG_VERSION = 1;

export interface UpgradeOptions {
  /** Root directory of ARTK instance */
  rootDir: string;
  /** Target version (default: current) */
  toVersion?: number;
  /** Create backup before upgrade */
  backup?: boolean;
  /** Dry run - don't write changes */
  dryRun?: boolean;
}

export interface UpgradeResult {
  success: boolean;
  fromVersion: number;
  toVersion: number;
  changes: UpgradeChange[];
  backupPath?: string;
  errors: string[];
}

export interface UpgradeChange {
  type: 'config' | 'file' | 'directory';
  path: string;
  description: string;
}

interface VersionUpgrade {
  type: 'config' | 'file' | 'directory';
  path: string;
  description: string;
  apply: (_rootDir: string) => Promise<void>;
}

/**
 * Upgrade ARTK autogen instance to new version
 */
export async function upgradeAutogenInstance(
  options: UpgradeOptions
): Promise<UpgradeResult> {
  const {
    rootDir,
    toVersion = CURRENT_CONFIG_VERSION,
    backup = true,
    dryRun = false,
  } = options;

  const result: UpgradeResult = {
    success: true,
    fromVersion: 0,
    toVersion,
    changes: [],
    errors: [],
  };

  try {
    // 1. Load current config
    const configPath = join(rootDir, 'autogen.config.yml');
    if (!existsSync(configPath)) {
      throw new Error('No autogen.config.yml found. Run install first.');
    }

    const configContent = readFileSync(configPath, 'utf-8');
    const config = parseYaml(configContent) as Record<string, unknown>;
    result.fromVersion = (config.version as number) || 0;

    // 2. Check if upgrade needed
    if (result.fromVersion >= toVersion) {
      result.changes.push({
        type: 'config',
        path: configPath,
        description: `Already at version ${result.fromVersion}, no upgrade needed`,
      });
      return result;
    }

    // 3. Create backup
    if (backup && !dryRun) {
      const backupPath = `${configPath}.backup-v${result.fromVersion}`;
      writeFileSync(backupPath, configContent);
      result.backupPath = backupPath;
      result.changes.push({
        type: 'file',
        path: backupPath,
        description: 'Created config backup',
      });
    }

    // 4. Migrate config
    const migrationResult = migrateConfig(config, toVersion);

    for (const migration of migrationResult.migrationsApplied) {
      result.changes.push({
        type: 'config',
        path: configPath,
        description: migration,
      });
    }

    // 5. Write migrated config
    if (!dryRun) {
      writeFileSync(configPath, stringifyYaml(migrationResult.config));
    }

    result.changes.push({
      type: 'config',
      path: configPath,
      description: `Upgraded config from v${result.fromVersion} to v${toVersion}`,
    });

    // 6. Version-specific upgrades
    const versionUpgrades = getVersionUpgrades(result.fromVersion, toVersion);

    for (const upgrade of versionUpgrades) {
      if (!dryRun) {
        await upgrade.apply(rootDir);
      }
      result.changes.push({
        type: upgrade.type,
        path: upgrade.path,
        description: upgrade.description,
      });
    }

  } catch (error) {
    result.success = false;
    result.errors.push(String(error));
  }

  return result;
}

/**
 * Migration interface
 */
interface Migration {
  fromVersion: number;
  toVersion: number;
  description: string;
  migrate: (_config: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Registry of all migrations
 */
const MIGRATIONS: Migration[] = [
  // Future migrations go here
  // {
  //   fromVersion: 1,
  //   toVersion: 2,
  //   description: 'Rename selectorPolicy to locatorPolicy',
  //   migrate: (config) => {
  //     if (config.selectorPolicy) {
  //       config.locatorPolicy = config.selectorPolicy;
  //       delete config.selectorPolicy;
  //     }
  //     return config;
  //   },
  // },
];

interface MigrationResult {
  migrated: boolean;
  fromVersion: number;
  toVersion: number;
  migrationsApplied: string[];
  config: Record<string, unknown>;
}

/**
 * Migrate config to target version
 */
function migrateConfig(
  config: Record<string, unknown>,
  toVersion: number = CURRENT_CONFIG_VERSION
): MigrationResult {
  const fromVersion = (config.version as number) || 0;
  let currentConfig = { ...config };
  const migrationsApplied: string[] = [];

  if (fromVersion === toVersion) {
    return {
      migrated: false,
      fromVersion,
      toVersion: fromVersion,
      migrationsApplied: [],
      config: currentConfig,
    };
  }

  // Apply migrations in order
  for (const migration of MIGRATIONS) {
    if (migration.fromVersion >= fromVersion &&
        migration.toVersion <= toVersion) {
      currentConfig = migration.migrate(currentConfig);
      migrationsApplied.push(migration.description);
    }
  }

  // Set target version
  currentConfig.version = toVersion;

  return {
    migrated: true,
    fromVersion,
    toVersion,
    migrationsApplied,
    config: currentConfig,
  };
}

/**
 * Get version-specific upgrade tasks
 */
function getVersionUpgrades(
  _fromVersion: number,
  _toVersion: number
): VersionUpgrade[] {
  const upgrades: VersionUpgrade[] = [];

  // Future version upgrades go here
  // if (fromVersion < 2 && toVersion >= 2) {
  //   upgrades.push({
  //     type: 'directory',
  //     path: 'tests/fixtures',
  //     description: 'Create fixtures directory for v2',
  //     apply: async (rootDir) => {
  //       mkdirSync(join(rootDir, 'tests/fixtures'), { recursive: true });
  //     },
  //   });
  // }

  return upgrades;
}

/**
 * Check if config needs migration
 */
export function needsMigration(config: Record<string, unknown>): boolean {
  const version = (config.version as number) || 0;
  return version < CURRENT_CONFIG_VERSION;
}

/**
 * Validate config version is supported
 */
export function isVersionSupported(version: number): boolean {
  return version >= 1 && version <= CURRENT_CONFIG_VERSION;
}
