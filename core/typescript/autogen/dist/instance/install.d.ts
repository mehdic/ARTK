export interface InstallOptions {
    /** Root directory to install into */
    rootDir: string;
    /** Project name (for config) */
    projectName?: string;
    /** Base URL for tests */
    baseUrl?: string;
    /** Test ID attribute */
    testIdAttribute?: string;
    /** Skip if already installed */
    skipIfExists?: boolean;
    /** Include example Journey */
    includeExample?: boolean;
    /** Force overwrite existing files */
    force?: boolean;
}
export interface InstallResult {
    success: boolean;
    created: string[];
    skipped: string[];
    errors: string[];
}
/**
 * Install ARTK autogen instance in a project
 */
export declare function installAutogenInstance(options: InstallOptions): Promise<InstallResult>;
//# sourceMappingURL=install.d.ts.map