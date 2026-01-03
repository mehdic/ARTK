import { parseArgs } from 'node:util';
import { installAutogenInstance } from '../instance/install.js';

export async function runInstall(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: {
      dir: { type: 'string', short: 'd', default: '.' },
      name: { type: 'string', short: 'n' },
      'base-url': { type: 'string' },
      'skip-existing': { type: 'boolean', default: false },
      'no-example': { type: 'boolean', default: false },
      force: { type: 'boolean', short: 'f', default: false },
    },
    allowPositionals: true,
  });

  console.log('Installing ARTK autogen...\n');

  const result = await installAutogenInstance({
    rootDir: values.dir as string,
    projectName: values.name as string | undefined,
    baseUrl: values['base-url'] as string | undefined,
    skipIfExists: values['skip-existing'] as boolean,
    includeExample: !values['no-example'],
    force: values.force as boolean,
  });

  if (result.success) {
    console.log('✓ Installation complete\n');

    if (result.created.length > 0) {
      console.log('Created:');
      for (const path of result.created) {
        console.log(`  + ${path}`);
      }
    }

    if (result.skipped.length > 0) {
      console.log('\nSkipped (already exists):');
      for (const path of result.skipped) {
        console.log(`  - ${path}`);
      }
    }

    console.log('\nNext steps:');
    console.log('  1. Edit autogen.config.yml with your project settings');
    console.log('  2. Create Journeys in journeys/ directory');
    console.log('  3. Run: npx artk-autogen generate <journey.md>');
  } else {
    console.error('✗ Installation failed:\n');
    for (const error of result.errors) {
      console.error(`  ${error}`);
    }
    process.exit(1);
  }
}
