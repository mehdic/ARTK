"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runUpgrade = runUpgrade;
const node_util_1 = require("node:util");
const upgrade_js_1 = require("../instance/upgrade.js");
async function runUpgrade(args) {
    const { values } = (0, node_util_1.parseArgs)({
        args,
        options: {
            dir: { type: 'string', short: 'd', default: '.' },
            'dry-run': { type: 'boolean', default: false },
            'no-backup': { type: 'boolean', default: false },
        },
        allowPositionals: true,
    });
    console.log('Upgrading ARTK autogen...\n');
    const result = await (0, upgrade_js_1.upgradeAutogenInstance)({
        rootDir: values.dir,
        dryRun: values['dry-run'],
        backup: !values['no-backup'],
    });
    if (values['dry-run']) {
        console.log('[DRY RUN] No changes written\n');
    }
    console.log(`Version: ${result.fromVersion} → ${result.toVersion}\n`);
    if (result.changes.length > 0) {
        console.log('Changes:');
        for (const change of result.changes) {
            console.log(`  ${change.description}`);
            console.log(`    → ${change.path}`);
        }
    }
    if (result.backupPath) {
        console.log(`\nBackup: ${result.backupPath}`);
    }
    if (!result.success) {
        console.error('\n✗ Upgrade failed:');
        for (const error of result.errors) {
            console.error(`  ${error}`);
        }
        process.exit(1);
    }
    console.log('\n✓ Upgrade complete');
}
//# sourceMappingURL=upgrade.js.map