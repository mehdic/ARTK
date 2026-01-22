/**
 * ARTK CLI - Init Command
 *
 * Initializes ARTK in a target project with automatic variant detection.
 */
import * as fs from 'fs';
import * as path from 'path';
import { selectVariant, hasExistingInstallation, validateVariantCompatibility, getNodeMajorVersion, } from '../utils/variant-detector.js';
import { getVariantDefinition, getVariantHelpText, MIN_NODE_VERSION, } from '../utils/variant-definitions.js';
import { createInstallLogger } from '../utils/install-logger.js';
import { createLockManager } from '../utils/lock-manager.js';
import { rollback, needsRollback } from '../utils/rollback.js';
import { isVariantId } from '../utils/variant-types.js';
import { getArtkVersion, validateVariantBuildFiles, copyVariantFiles, writeAllAiProtectionMarkers, writeCopilotInstructions, } from '../utils/variant-files.js';
/**
 * Get ARTK version from package.json or fallback.
 */
const ARTK_VERSION = getArtkVersion();
/**
 * Execute the init command.
 */
export async function init(options) {
    const { targetPath, variant, force } = options;
    const warnings = [];
    // Validate target path
    if (!fs.existsSync(targetPath)) {
        return {
            success: false,
            error: `Target directory does not exist: ${targetPath}`,
        };
    }
    // Check Node.js version
    const nodeVersion = getNodeMajorVersion();
    if (nodeVersion < MIN_NODE_VERSION) {
        return {
            success: false,
            error: `Node.js ${nodeVersion} is not supported. ARTK requires Node.js ${MIN_NODE_VERSION} or higher.`,
        };
    }
    // Initialize logging and lock manager
    const logger = createInstallLogger(targetPath);
    const lockManager = createLockManager(targetPath);
    // Try to acquire lock
    const { acquired, error: lockError } = lockManager.acquire('install');
    if (!acquired) {
        return {
            success: false,
            error: lockError || 'Failed to acquire installation lock',
        };
    }
    try {
        // Check for existing installation
        if (hasExistingInstallation(targetPath) && !force) {
            lockManager.release();
            return {
                success: false,
                error: 'ARTK is already installed in this project. Use --force to overwrite.',
            };
        }
        // Check for partial installation that needs rollback
        const rollbackCheck = needsRollback(targetPath);
        if (rollbackCheck.needed) {
            warnings.push(`Cleaning up partial installation: ${rollbackCheck.reason}`);
            rollback(targetPath, rollbackCheck.reason || 'Partial installation cleanup');
        }
        // Validate and select variant
        let selectedVariant;
        if (variant) {
            // User specified a variant
            if (!isVariantId(variant)) {
                lockManager.release();
                return {
                    success: false,
                    error: `Invalid variant: ${variant}\n\n${getVariantHelpText()}`,
                };
            }
            const compatibility = validateVariantCompatibility(variant, nodeVersion);
            if (!compatibility.valid) {
                lockManager.release();
                return {
                    success: false,
                    error: compatibility.error,
                };
            }
            selectedVariant = variant;
            warnings.push(`Using manually specified variant: ${selectedVariant}`);
        }
        else {
            // Auto-detect variant
            const detection = selectVariant({ targetPath });
            if (!detection.success) {
                lockManager.release();
                return {
                    success: false,
                    error: detection.error || 'Failed to detect environment',
                };
            }
            selectedVariant = detection.selectedVariant;
        }
        const variantDef = getVariantDefinition(selectedVariant);
        // Check if variant build files exist
        const buildValidation = validateVariantBuildFiles(selectedVariant);
        if (!buildValidation.valid) {
            lockManager.release();
            return {
                success: false,
                error: buildValidation.error,
            };
        }
        // Log start
        logger.logInstallStart(selectedVariant, nodeVersion);
        logger.logDetection(nodeVersion, variantDef.moduleSystem, selectedVariant);
        // Create directory structure
        const artkE2e = path.join(targetPath, 'artk-e2e');
        const vendorCore = path.join(artkE2e, 'vendor', 'artk-core');
        const vendorAutogen = path.join(artkE2e, 'vendor', 'artk-core-autogen');
        const artkDir = path.join(targetPath, '.artk');
        // Preserve user config if --force reinstall
        const artkConfigPath = path.join(artkE2e, 'artk.config.yml');
        let preservedConfig = null;
        if (force && fs.existsSync(artkConfigPath)) {
            preservedConfig = fs.readFileSync(artkConfigPath, 'utf-8');
            logger.info('install', 'Preserved user config: artk.config.yml');
        }
        fs.mkdirSync(artkE2e, { recursive: true });
        fs.mkdirSync(artkDir, { recursive: true });
        // Copy variant files from ARTK core to vendor directories
        const copyResult = copyVariantFiles(selectedVariant, targetPath);
        if (!copyResult.success) {
            lockManager.release();
            rollback(targetPath, `Failed to copy variant files: ${copyResult.error}`);
            return {
                success: false,
                error: copyResult.error,
            };
        }
        logger.info('install', `Copied ${copyResult.copiedFiles} files for variant ${selectedVariant}`);
        // Add any warnings from copy operation
        if (copyResult.warnings) {
            warnings.push(...copyResult.warnings);
            for (const warning of copyResult.warnings) {
                logger.warn('install', warning);
            }
        }
        // Restore preserved user config
        if (preservedConfig !== null) {
            fs.writeFileSync(artkConfigPath, preservedConfig, 'utf-8');
            logger.info('install', 'Restored user config: artk.config.yml');
        }
        // Write context.json
        const context = {
            variant: selectedVariant,
            variantInstalledAt: new Date().toISOString(),
            nodeVersion,
            moduleSystem: variantDef.moduleSystem,
            playwrightVersion: variantDef.playwrightVersion,
            artkVersion: ARTK_VERSION,
            installMethod: 'cli',
            overrideUsed: Boolean(variant),
        };
        fs.writeFileSync(path.join(artkDir, 'context.json'), JSON.stringify(context, null, 2), 'utf-8');
        // Write AI protection markers to both vendor directories
        writeAllAiProtectionMarkers(vendorCore, selectedVariant, context);
        writeAllAiProtectionMarkers(vendorAutogen, selectedVariant, context);
        // Write variant-aware Copilot instructions
        writeCopilotInstructions(targetPath, selectedVariant);
        logger.info('install', 'Generated variant-aware Copilot instructions');
        // Log completion
        logger.logInstallComplete(selectedVariant);
        return {
            success: true,
            variant: selectedVariant,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logger.logInstallFailed(message, variant);
        // Attempt rollback
        rollback(targetPath, `Installation failed: ${message}`);
        return {
            success: false,
            error: `Installation failed: ${message}`,
            warnings: warnings.length > 0 ? warnings : undefined,
        };
    }
    finally {
        lockManager.release();
    }
}
/**
 * CLI entry point for init command.
 */
export function parseInitArgs(args) {
    const options = {
        targetPath: process.cwd(),
    };
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--variant' && args[i + 1]) {
            options.variant = args[++i];
        }
        else if (arg?.startsWith('--variant=')) {
            options.variant = arg.split('=')[1];
        }
        else if (arg === '--force' || arg === '-f') {
            options.force = true;
        }
        else if (arg === '--skip-npm') {
            options.skipNpm = true;
        }
        else if (arg === '--skip-browsers') {
            options.skipBrowsers = true;
        }
        else if (arg === '--help' || arg === '-h') {
            printInitHelp();
            process.exit(0);
        }
        else if (!arg?.startsWith('-') && arg) {
            options.targetPath = path.resolve(arg);
        }
    }
    return options;
}
/**
 * Print help for init command.
 */
function printInitHelp() {
    console.log(`
ARTK Init Command

Usage: artk init [path] [options]

Arguments:
  path              Target project path (default: current directory)

Options:
  --variant <id>    Force a specific variant instead of auto-detection
  --force, -f       Overwrite existing installation
  --skip-npm        Skip npm install
  --skip-browsers   Skip browser installation
  --help, -h        Show this help message

${getVariantHelpText()}

Examples:
  artk init                        # Initialize in current directory
  artk init ./my-project           # Initialize in specific directory
  artk init --variant legacy-16    # Force legacy-16 variant
  artk init --force                # Overwrite existing installation
`);
}
//# sourceMappingURL=init.js.map