import { parseArgs } from 'node:util';
import { upgradeAutogenInstance } from '../instance/upgrade.js';

export async function runUpgrade(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      dir: { type: 'string', short: 'd', default: '.' },
      'dry-run': { type: 'boolean', default: false },
      'no-backup': { type: 'boolean', default: false },
    },
    allowPositionals: true,
  });

  console.log('Upgrading ARTK autogen...\n');

  const result = await upgradeAutogenInstance({
    rootDir: values.dir as string,
    dryRun: values['dry-run'] as boolean,
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
