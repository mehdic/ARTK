#!/usr/bin/env npx ts-node
/**
 * ARTK Config Generator Script
 *
 * Converts detection results to ARTK configuration YAML.
 * Used by /init command to bootstrap artk.config.yml.
 *
 * @module scripts/generate-config
 *
 * @example
 * ```bash
 * # Direct invocation with JSON input
 * echo '{"targets":[...]}' | npx ts-node scripts/generate-config.ts
 *
 * # From detection results file
 * npx ts-node scripts/generate-config.ts --input detection.json --output artk.config.yml
 *
 * # Programmatic usage
 * import { generateConfig } from './scripts/generate-config';
 * const yaml = await generateConfig(detectionResults);
 * ```
 */

import { z } from 'zod';
import { stringify } from 'yaml';
import * as fs from 'node:fs';
import * as path from 'node:path';

// =============================================================================
// Schema Definitions (T013: Zod validation)
// =============================================================================

/**
 * Zod schema for detection result input.
 */
const DetectionResultSchema = z.object({
  path: z.string(),
  relativePath: z.string(),
  confidence: z.enum(['high', 'medium', 'low']),
  type: z.enum(['react-spa', 'vue-spa', 'angular', 'next', 'nuxt', 'other']),
  signals: z.array(z.string()),
  score: z.number(),
  detailedSignals: z
    .array(
      z.object({
        type: z.string(),
        source: z.string(),
        weight: z.number(),
        description: z.string().optional(),
      })
    )
    .optional(),
});

/**
 * Zod schema for config generator input.
 */
const GeneratorInputSchema = z.object({
  projectName: z.string().optional(),
  projectDescription: z.string().optional(),
  targets: z.array(DetectionResultSchema).min(1),
  authType: z.enum(['oidc', 'form', 'token', 'none']).default('none'),
  authProvider: z.string().optional(),
  keycloak: z
    .object({
      realm: z.string(),
      clientId: z.string(),
      authServerUrl: z.string().url(),
    })
    .optional(),
  roles: z
    .array(
      z.object({
        id: z.string(),
        username: z.string(),
        password: z.string(),
        keycloakRole: z.string().optional(),
      })
    )
    .optional(),
  environments: z
    .record(
      z.object({
        baseUrl: z.string().url(),
      })
    )
    .optional(),
});

export type GeneratorInput = z.infer<typeof GeneratorInputSchema>;
export type DetectionResult = z.infer<typeof DetectionResultSchema>;

/**
 * Zod schema for the generated ARTK config output.
 * Matches the JSON schema at specs/003-artk-pilot-launch/contracts/artk-config.schema.json
 */
const ARTKConfigOutputSchema = z.object({
  schema: z.literal('2.0'),
  project: z.object({
    name: z.string().min(1),
    description: z.string().optional(),
  }),
  targets: z
    .array(
      z.object({
        name: z.string().regex(/^[a-z][a-z0-9-]*$/),
        path: z.string(),
        type: z.enum(['react-spa', 'vue-spa', 'angular', 'next', 'nuxt', 'other']),
        environments: z.record(
          z.object({
            baseUrl: z.string(),
          })
        ),
      })
    )
    .min(1),
  auth: z.object({
    type: z.enum(['oidc', 'form', 'token', 'none']),
    provider: z.string().optional(),
    keycloak: z
      .object({
        realm: z.string(),
        clientId: z.string(),
        authServerUrl: z.string(),
      })
      .optional(),
    roles: z
      .array(
        z.object({
          id: z.string(),
          username: z.string(),
          password: z.string(),
          keycloakRole: z.string().optional(),
        })
      )
      .optional(),
  }),
  test: z
    .object({
      tier: z.enum(['smoke', 'release', 'regression']).optional(),
      stabilityPasses: z.number().int().min(1).max(10).optional(),
      authRetryOnce: z.boolean().optional(),
    })
    .optional(),
});

export type ARTKConfigOutput = z.infer<typeof ARTKConfigOutputSchema>;

// =============================================================================
// Config Generation (T012: Detection to YAML conversion)
// =============================================================================

/**
 * Generates a kebab-case target name from a path or detection result.
 */
function generateTargetName(relativePath: string, index: number): string {
  // Extract directory name from path
  const dirName = path.basename(relativePath).toLowerCase();

  // Clean to kebab-case
  const cleaned = dirName.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Validate pattern
  if (cleaned && /^[a-z][a-z0-9-]*$/.test(cleaned)) {
    return cleaned;
  }

  // Fallback to generic name
  return index === 0 ? 'frontend' : `frontend-${index + 1}`;
}

/**
 * Converts detection results to ARTK target format.
 */
function detectionToTarget(
  detection: DetectionResult,
  index: number,
  environments?: Record<string, { baseUrl: string }>
): ARTKConfigOutput['targets'][number] {
  const name = generateTargetName(detection.relativePath, index);

  // Default environments if not provided
  const defaultEnvs: Record<string, { baseUrl: string }> = {
    local: {
      baseUrl: 'http://localhost:3000',
    },
  };

  return {
    name,
    path: detection.relativePath,
    type: detection.type,
    environments: environments ?? defaultEnvs,
  };
}

/**
 * Generates ARTK configuration from detection results.
 *
 * @param input - Generator input with detection results and options
 * @returns Generated ARTK configuration object
 */
export function generateConfig(input: GeneratorInput): ARTKConfigOutput {
  // Validate input
  const validatedInput = GeneratorInputSchema.parse(input);

  // Build config object
  const config: ARTKConfigOutput = {
    schema: '2.0',
    project: {
      name: validatedInput.projectName ?? 'ARTK Project',
      description: validatedInput.projectDescription,
    },
    targets: validatedInput.targets.map((t, i) =>
      detectionToTarget(t, i, validatedInput.environments)
    ),
    auth: {
      type: validatedInput.authType,
    },
    test: {
      tier: 'release',
      stabilityPasses: 3,
      authRetryOnce: true,
    },
  };

  // Add auth provider if specified
  if (validatedInput.authProvider) {
    config.auth.provider = validatedInput.authProvider;
  }

  // Add Keycloak config if specified
  if (validatedInput.keycloak) {
    config.auth.keycloak = validatedInput.keycloak;
  }

  // Add roles if specified
  if (validatedInput.roles && validatedInput.roles.length > 0) {
    config.auth.roles = validatedInput.roles;
  }

  // Validate output
  return ARTKConfigOutputSchema.parse(config);
}

/**
 * Generates ARTK configuration YAML string from detection results.
 *
 * @param input - Generator input with detection results and options
 * @returns YAML string of the configuration
 */
export function generateConfigYaml(input: GeneratorInput): string {
  const config = generateConfig(input);

  // Generate YAML with proper formatting
  const yaml = stringify(config, {
    indent: 2,
    lineWidth: 80,
    defaultStringType: 'PLAIN',
    defaultKeyType: 'PLAIN',
  });

  return yaml;
}

/**
 * Validates an existing config object or YAML against the schema.
 *
 * @param config - Config object to validate
 * @returns Validation result with success flag and errors
 */
export function validateConfig(
  config: unknown
): { success: true; data: ARTKConfigOutput } | { success: false; errors: z.ZodError } {
  const result = ARTKConfigOutputSchema.safeParse(config);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

// =============================================================================
// CLI Interface
// =============================================================================

interface CLIOptions {
  input?: string;
  output?: string;
  stdin?: boolean;
  projectName?: string;
  projectDescription?: string;
  authType?: 'oidc' | 'form' | 'token' | 'none';
  authProvider?: string;
  keycloakRealm?: string;
  keycloakClientId?: string;
  keycloakAuthServer?: string;
  localBaseUrl?: string;
  help?: boolean;
}

function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--input':
      case '-i':
        options.input = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--stdin':
        options.stdin = true;
        break;
      case '--project-name':
        options.projectName = args[++i];
        break;
      case '--project-description':
        options.projectDescription = args[++i];
        break;
      case '--auth-type':
        options.authType = args[++i] as CLIOptions['authType'];
        break;
      case '--auth-provider':
        options.authProvider = args[++i];
        break;
      case '--keycloak-realm':
        options.keycloakRealm = args[++i];
        break;
      case '--keycloak-client-id':
        options.keycloakClientId = args[++i];
        break;
      case '--keycloak-auth-server':
        options.keycloakAuthServer = args[++i];
        break;
      case '--local-base-url':
        options.localBaseUrl = args[++i];
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`
ARTK Config Generator

Usage:
  npx ts-node scripts/generate-config.ts [options]

Options:
  -i, --input <file>           Input JSON file with detection results
  -o, --output <file>          Output YAML file (default: stdout)
  --stdin                      Read input from stdin
  --project-name <name>        Project name for config
  --project-description <desc> Project description
  --auth-type <type>           Auth type: oidc, form, token, none (default: none)
  --auth-provider <provider>   Auth provider name (e.g., keycloak)
  --keycloak-realm <realm>     Keycloak realm name
  --keycloak-client-id <id>    Keycloak client ID
  --keycloak-auth-server <url> Keycloak auth server URL
  --local-base-url <url>       Local environment base URL (default: http://localhost:3000)
  -h, --help                   Show this help message

Input Format (JSON):
  {
    "targets": [
      {
        "path": "/absolute/path",
        "relativePath": "../frontend",
        "confidence": "high",
        "type": "react-spa",
        "signals": ["package-dependency:react"],
        "score": 50
      }
    ]
  }

Examples:
  # Generate config from detection results
  npx ts-node scripts/generate-config.ts -i detection.json -o artk.config.yml

  # Pipe detection results
  cat detection.json | npx ts-node scripts/generate-config.ts --stdin

  # With auth configuration
  npx ts-node scripts/generate-config.ts -i detection.json \\
    --auth-type oidc \\
    --auth-provider keycloak \\
    --keycloak-realm REQ \\
    --keycloak-client-id iss-frontend \\
    --keycloak-auth-server http://localhost:8080
`);
}

async function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data);
    });
    process.stdin.on('error', reject);
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  // Read input
  let inputJson: string;

  if (options.input) {
    inputJson = fs.readFileSync(options.input, 'utf8');
  } else if (options.stdin || !process.stdin.isTTY) {
    inputJson = await readStdin();
  } else {
    console.error('Error: No input provided. Use --input <file> or --stdin');
    process.exit(1);
  }

  // Parse input JSON
  let inputData: unknown;
  try {
    inputData = JSON.parse(inputJson);
  } catch (e) {
    console.error('Error: Invalid JSON input');
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }

  // Build generator input
  const generatorInput: GeneratorInput = {
    targets: (inputData as { targets?: unknown }).targets as DetectionResult[],
    projectName: options.projectName,
    projectDescription: options.projectDescription,
    authType: options.authType,
    authProvider: options.authProvider,
    environments: options.localBaseUrl
      ? { local: { baseUrl: options.localBaseUrl } }
      : undefined,
  };

  // Add Keycloak config if provided
  if (options.keycloakRealm && options.keycloakClientId && options.keycloakAuthServer) {
    generatorInput.keycloak = {
      realm: options.keycloakRealm,
      clientId: options.keycloakClientId,
      authServerUrl: options.keycloakAuthServer,
    };
  }

  // Generate config
  try {
    const yaml = generateConfigYaml(generatorInput);

    if (options.output) {
      fs.writeFileSync(options.output, yaml, 'utf8');
      console.log(`Config written to: ${options.output}`);
    } else {
      console.log(yaml);
    }
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.error('Validation Error:');
      for (const issue of e.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
      process.exit(1);
    }
    throw e;
  }
}

// Run CLI if executed directly
if (require.main === module) {
  main().catch((e) => {
    console.error('Error:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  });
}
