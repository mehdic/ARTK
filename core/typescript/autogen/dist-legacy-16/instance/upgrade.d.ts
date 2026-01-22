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
/**
 * Upgrade ARTK autogen instance to new version
 */
export declare function upgradeAutogenInstance(options: UpgradeOptions): Promise<UpgradeResult>;
/**
 * Check if config needs migration
 */
export declare function needsMigration(config: Record<string, unknown>): boolean;
/**
 * Validate config version is supported
 */
export declare function isVersionSupported(version: number): boolean;
//# sourceMappingURL=upgrade.d.ts.map