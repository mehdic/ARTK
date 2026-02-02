/**
 * LLKB Seed Command
 *
 * Pre-seed LLKB with universal patterns to solve cold start problem.
 * Seeds are loaded from CLI assets/llkb-seeds/ directory.
 *
 * Security: Validates seed names to prevent path traversal attacks.
 */

import { Command } from 'commander';
import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTED INTERFACES (for reuse in other modules)
// ═══════════════════════════════════════════════════════════════════════════

export interface SeedLesson {
  id: string;
  category: string;
  scope: string;
  trigger: string;
  pattern: string;
  confidence: number;
  description: string;
}

export interface SeedComponent {
  id: string;
  name: string;
  category: string;
  scope: string;
  description: string;
  code: string;
  confidence: number;
}

export interface SeedFile {
  $schema?: string;
  schemaVersion: string;
  name: string;
  description: string;
  createdAt: string;
  lessons: SeedLesson[];
  components: SeedComponent[];
}

interface LessonsFile {
  version: string;
  lastUpdated: string;
  lessons: SeedLesson[];
  globalRules: unknown[];
  appQuirks: unknown[];
}

interface ComponentsFile {
  version: string;
  lastUpdated: string;
  components: SeedComponent[];
  componentsByCategory: Record<string, string[]>;
  componentsByScope: Record<string, string[]>;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECURITY: Input validation
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate seed name to prevent path traversal attacks
 * Only allows alphanumeric characters, hyphens, and underscores
 */
function validateSeedName(seedName: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(seedName)) {
    throw new Error(
      `Invalid seed name: "${seedName}". ` +
      'Seed names must contain only alphanumeric characters, hyphens, and underscores.'
    );
  }

  // Additional check: no reserved names
  const reserved = ['..', '.', 'schema', 'node_modules'];
  if (reserved.includes(seedName.toLowerCase())) {
    throw new Error(`Invalid seed name: "${seedName}" is a reserved name.`);
  }
}

/**
 * Validate seed file structure
 */
function validateSeedFile(data: unknown, seedName: string): SeedFile {
  if (!data || typeof data !== 'object') {
    throw new Error(`Invalid seed file structure: expected object`);
  }

  const obj = data as Record<string, unknown>;

  // Required fields
  if (typeof obj.schemaVersion !== 'string') {
    throw new Error(`Invalid seed file: missing or invalid schemaVersion`);
  }
  if (typeof obj.name !== 'string') {
    throw new Error(`Invalid seed file: missing or invalid name`);
  }
  if (!Array.isArray(obj.lessons)) {
    throw new Error(`Invalid seed file: lessons must be an array`);
  }
  if (!Array.isArray(obj.components)) {
    throw new Error(`Invalid seed file: components must be an array`);
  }

  // Validate each lesson
  for (let i = 0; i < obj.lessons.length; i++) {
    const lesson = obj.lessons[i] as Record<string, unknown>;
    if (!lesson.id || typeof lesson.id !== 'string') {
      throw new Error(`Invalid lesson at index ${i}: missing id`);
    }
    if (!lesson.trigger || typeof lesson.trigger !== 'string') {
      throw new Error(`Invalid lesson at index ${i}: missing trigger`);
    }
    if (!lesson.pattern || typeof lesson.pattern !== 'string') {
      throw new Error(`Invalid lesson at index ${i}: missing pattern`);
    }
    if (typeof lesson.confidence !== 'number' || lesson.confidence < 0 || lesson.confidence > 1) {
      throw new Error(`Invalid lesson at index ${i}: confidence must be between 0 and 1`);
    }
  }

  // Validate each component
  for (let i = 0; i < obj.components.length; i++) {
    const comp = obj.components[i] as Record<string, unknown>;
    if (!comp.id || typeof comp.id !== 'string') {
      throw new Error(`Invalid component at index ${i}: missing id`);
    }
    if (!comp.name || typeof comp.name !== 'string') {
      throw new Error(`Invalid component at index ${i}: missing name`);
    }
    if (!comp.code || typeof comp.code !== 'string') {
      throw new Error(`Invalid component at index ${i}: missing code`);
    }
  }

  return {
    $schema: obj.$schema as string | undefined,
    schemaVersion: obj.schemaVersion as string,
    name: obj.name as string,
    description: (obj.description as string) || '',
    createdAt: (obj.createdAt as string) || new Date().toISOString(),
    lessons: obj.lessons as SeedLesson[],
    components: obj.components as SeedComponent[],
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the assets directory path (works in both dev and installed contexts)
 */
function getAssetsDir(): string {
  const possiblePaths = [
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'assets'),
    join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets'),
    join(process.cwd(), 'node_modules', '@artk', 'cli', 'assets'),
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  throw new Error('Could not find CLI assets directory');
}

/**
 * Load and validate a seed file from the assets directory
 */
function loadSeedFile(seedName: string): SeedFile {
  // Security: Validate seed name first
  validateSeedName(seedName);

  const assetsDir = getAssetsDir();
  const seedPath = join(assetsDir, 'llkb-seeds', `${seedName}.json`);

  if (!existsSync(seedPath)) {
    throw new Error(`Seed file not found: ${seedPath}`);
  }

  const content = readFileSync(seedPath, 'utf-8');
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch (e) {
    throw new Error(`Invalid JSON in seed file: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Validate structure
  return validateSeedFile(parsed, seedName);
}

/**
 * List available seed files
 */
function listAvailableSeeds(): string[] {
  const assetsDir = getAssetsDir();
  const seedsDir = join(assetsDir, 'llkb-seeds');

  if (!existsSync(seedsDir)) {
    return [];
  }

  const files = readdirSync(seedsDir);
  return files
    .filter((f: string) => f.endsWith('.json') && !f.includes('schema'))
    .map((f: string) => f.replace('.json', ''));
}

/**
 * Atomic write with backup - prevents corruption on failure
 */
function writeFileAtomic(filePath: string, content: string): void {
  const backupPath = `${filePath}.backup`;
  const tempPath = `${filePath}.tmp`;

  // Create backup of existing file
  if (existsSync(filePath)) {
    copyFileSync(filePath, backupPath);
  }

  try {
    // Write to temp file first
    writeFileSync(tempPath, content, 'utf-8');

    // Rename temp to final (atomic on most filesystems)
    const { renameSync } = require('fs');
    renameSync(tempPath, filePath);

    // Remove backup on success
    if (existsSync(backupPath)) {
      const { unlinkSync } = require('fs');
      unlinkSync(backupPath);
    }
  } catch (error) {
    // Restore from backup on failure
    if (existsSync(backupPath)) {
      copyFileSync(backupPath, filePath);
    }
    // Clean up temp file
    if (existsSync(tempPath)) {
      const { unlinkSync } = require('fs');
      unlinkSync(tempPath);
    }
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMMAND IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export function seedCommand(program: Command): void {
  program
    .command('seed')
    .description('Pre-seed LLKB with universal patterns')
    .option('--llkb-root <path>', 'LLKB root directory', '.artk/llkb')
    .option('--patterns <name>', 'Seed patterns to load (e.g., universal)', 'universal')
    .option('--list', 'List available seed files')
    .option('--dry-run', 'Show what would be seeded without writing')
    .action(async (options) => {
      const llkbRoot = options.llkbRoot as string;
      const seedName = options.patterns as string;

      // List available seeds
      if (options.list) {
        const seeds = listAvailableSeeds();
        console.log('Available seed patterns:');
        for (const seed of seeds) {
          console.log(`  - ${seed}`);
        }
        return;
      }

      // Security: Validate seed name early
      try {
        validateSeedName(seedName);
      } catch (error) {
        console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }

      // Check if LLKB is initialized
      if (!existsSync(join(llkbRoot, 'config.yml'))) {
        console.error(`❌ LLKB not initialized at ${llkbRoot}`);
        console.error('   Run: artk llkb init --llkb-root ' + llkbRoot);
        process.exit(1);
      }

      console.log(`Loading seed: ${seedName}...`);

      try {
        // Load and validate seed file
        const seed = loadSeedFile(seedName);

        console.log(`📦 Seed: ${seed.name}`);
        console.log(`   ${seed.description}`);
        console.log(`   Lessons: ${seed.lessons.length}`);
        console.log(`   Components: ${seed.components.length}`);

        if (options.dryRun) {
          console.log('\n📋 Dry-run mode - showing what would be seeded:\n');

          console.log('Lessons by category:');
          const lessonsByCategory = new Map<string, SeedLesson[]>();
          for (const lesson of seed.lessons) {
            const cat = lesson.category || 'uncategorized';
            if (!lessonsByCategory.has(cat)) {
              lessonsByCategory.set(cat, []);
            }
            lessonsByCategory.get(cat)!.push(lesson);
          }
          for (const [category, lessons] of lessonsByCategory) {
            console.log(`\n  ${category} (${lessons.length}):`);
            for (const lesson of lessons.slice(0, 5)) {
              console.log(`    - ${lesson.id}: ${lesson.description}`);
            }
            if (lessons.length > 5) {
              console.log(`    ... and ${lessons.length - 5} more`);
            }
          }

          console.log('\n\nComponents:');
          for (const comp of seed.components) {
            console.log(`  - ${comp.id}: ${comp.name} (${comp.category})`);
          }

          return;
        }

        // Load existing LLKB files with error handling
        const lessonsPath = join(llkbRoot, 'lessons.json');
        const componentsPath = join(llkbRoot, 'components.json');

        let lessons: LessonsFile;
        let components: ComponentsFile;

        try {
          lessons = JSON.parse(readFileSync(lessonsPath, 'utf-8'));
        } catch (e) {
          throw new Error(`Failed to read lessons.json: ${e instanceof Error ? e.message : String(e)}`);
        }

        try {
          components = JSON.parse(readFileSync(componentsPath, 'utf-8'));
        } catch (e) {
          throw new Error(`Failed to read components.json: ${e instanceof Error ? e.message : String(e)}`);
        }

        // Track what was added
        let lessonsAdded = 0;
        let componentsAdded = 0;
        let lessonsSkipped = 0;
        let componentsSkipped = 0;

        // Merge lessons (skip duplicates by ID)
        const existingLessonIds = new Set(lessons.lessons.map((l) => l.id));
        for (const lesson of seed.lessons) {
          if (existingLessonIds.has(lesson.id)) {
            lessonsSkipped++;
          } else {
            lessons.lessons.push(lesson);
            lessonsAdded++;
          }
        }

        // Merge components (skip duplicates by ID)
        const existingComponentIds = new Set(components.components.map((c) => c.id));
        for (const comp of seed.components) {
          if (existingComponentIds.has(comp.id)) {
            componentsSkipped++;
          } else {
            components.components.push(comp);

            // Update category index
            if (!components.componentsByCategory[comp.category]) {
              components.componentsByCategory[comp.category] = [];
            }
            components.componentsByCategory[comp.category].push(comp.id);

            // Update scope index
            if (!components.componentsByScope[comp.scope]) {
              components.componentsByScope[comp.scope] = [];
            }
            components.componentsByScope[comp.scope].push(comp.id);

            componentsAdded++;
          }
        }

        // Update timestamps
        const now = new Date().toISOString();
        lessons.lastUpdated = now;
        components.lastUpdated = now;

        // Write back with atomic writes (prevents corruption)
        writeFileAtomic(lessonsPath, JSON.stringify(lessons, null, 2));
        writeFileAtomic(componentsPath, JSON.stringify(components, null, 2));

        console.log('\n✅ Seed applied successfully:');
        console.log(`   Lessons added: ${lessonsAdded}`);
        console.log(`   Lessons skipped (already exist): ${lessonsSkipped}`);
        console.log(`   Components added: ${componentsAdded}`);
        console.log(`   Components skipped (already exist): ${componentsSkipped}`);

        // Log to history (optional, failures are silent)
        try {
          const { appendToHistory } = await import('@artk/core/llkb');
          await appendToHistory(
            {
              event: 'seed_applied',
              seedName,
              lessonsAdded,
              componentsAdded,
            },
            llkbRoot
          );
        } catch {
          // History logging is optional
        }
      } catch (error) {
        console.error(`❌ Failed to apply seed: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });
}
