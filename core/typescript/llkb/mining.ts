/**
 * LLKB Mining Module
 *
 * Extracts entities, routes, forms, tables, and modals from codebases
 * to enable zero-config pattern generation.
 *
 * Extraction sources:
 * - Entities: API calls, TypeScript types, database models (Prisma, TypeORM)
 * - Routes: React Router, Next.js, Angular Router, Vue Router
 * - Forms: Zod/Yup schemas, React Hook Form, Formik, HTML forms
 * - Tables: AG Grid, TanStack Table, MUI DataGrid, HTML tables
 * - Modals: MUI Dialog, Radix Dialog, React Modal, custom patterns
 *
 * ARCH-002: Uses MiningCache for file caching to reduce I/O
 * ARCH-003: Uses SOURCE_DIRECTORIES for consistent directory coverage
 *
 * @module llkb/mining
 */

import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import type {
  DiscoveredElements,
  DiscoveredEntity,
  DiscoveredForm,
  DiscoveredModal,
  DiscoveredRoute,
  DiscoveredTable,
  FormField,
  GenerationResult,
} from './template-generators.js';
import { pluralize, singularize } from './pluralization.js';
import {
  MiningCache,
  scanAllSourceDirectories,
  type ScannedFile,
} from './mining-cache.js';

// =============================================================================
// Constants
// =============================================================================

/** Maximum recursion depth for directory scanning */
const MAX_SCAN_DEPTH = 15;
/** Maximum number of files to scan */
const MAX_FILES_TO_SCAN = 3000;
/** Maximum file size to read (SEC-002: prevent memory issues with large files) */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
/** SEC-004: Maximum regex iterations to prevent ReDoS on pathological input */
const MAX_REGEX_ITERATIONS = 10_000;
/** Extensions to scan */
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];

// =============================================================================
// Security Helpers (SEC-001, SEC-002)
// =============================================================================

/**
 * Validate that a path is within the project root (SEC-001: prevent path traversal)
 */
function validatePathWithinRoot(projectRoot: string, targetPath: string): boolean {
  const resolvedRoot = path.resolve(projectRoot);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedRoot + path.sep) || resolvedTarget === resolvedRoot;
}

/**
 * Check if file size is within limits (SEC-002: prevent memory issues)
 */
async function isFileSizeWithinLimit(filePath: string): Promise<boolean> {
  try {
    const stats = await fsp.lstat(filePath);
    // SEC-005: Reject symlinks
    if (stats.isSymbolicLink()) {return false;}
    return stats.size <= MAX_FILE_SIZE_BYTES;
  } catch {
    return false;
  }
}

/**
 * Count source files in a directory (BUG-006: track filesScanned stat)
 */
// @ts-expect-error Reserved for future use
function _countSourceFilesInDir(
  dir: string,
  count: { value: number },
  depth: number = 0,
  maxDepth: number = MAX_SCAN_DEPTH
): void {
  if (depth > maxDepth || count.value > MAX_FILES_TO_SCAN) {return;}

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (count.value > MAX_FILES_TO_SCAN) {break;}

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'dist' &&
          entry.name !== 'build' &&
          !entry.isSymbolicLink()) {
        _countSourceFilesInDir(fullPath, count, depth + 1, maxDepth);
      }
    } else if (entry.isFile() && SOURCE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      count.value++;
    }
  }
}

// =============================================================================
// Pluralization - ARCH-001 FIX: Now imported from shared module
// =============================================================================
// pluralize and singularize are imported from './pluralization.js'

// =============================================================================
// Entity Mining
// =============================================================================

/**
 * Patterns to extract entity names from code
 */
const ENTITY_PATTERNS = {
  // TypeScript/JavaScript types and interfaces (including exported)
  // BUG-002 FIX: Added optional export prefix to catch exported interfaces/types
  typeInterface: /(?:export\s+)?(?:interface|type)\s+(\w+)(?:\s+extends|\s*[={<])/g,

  // Class names (often entities in ORM) - also handle exported classes
  className: /(?:export\s+)?class\s+(\w+)(?:\s+extends|\s+implements|\s*\{)/g,

  // Prisma model
  prismaModel: /model\s+(\w+)\s*\{/g,

  // TypeORM Entity
  typeormEntity: /@Entity\s*\(\s*['"]?(\w+)?['"]?\s*\)/g,

  // API fetch patterns
  apiFetch: /(?:fetch|axios\.(?:get|post|put|delete|patch))\s*\(\s*[`'"]\/?(?:api\/)?(\w+)/gi,

  // REST resource patterns
  restResource: /\/api\/(\w+)(?:\/|['"`])/gi,

  // GraphQL types
  graphqlType: /type\s+(\w+)\s*(?:@|\{|implements)/g,

  // Mongoose/MongoDB schema
  mongooseSchema: /new\s+(?:mongoose\.)?Schema\s*<?\s*(\w+)?/g,
  mongooseModel: /mongoose\.model\s*[<(]\s*['"]?(\w+)/g,

  // Sequelize model
  sequelizeModel: /sequelize\.define\s*\(\s*['"](\w+)/g,

  // MikroORM entity
  mikroEntity: /@Entity\s*\(\s*\{\s*(?:tableName|collection)\s*:\s*['"](\w+)/g,
};

/**
 * Words to exclude from entity detection
 */
const ENTITY_EXCLUSIONS = new Set([
  // Common utility types
  'props', 'state', 'context', 'config', 'options', 'params', 'args',
  'request', 'response', 'result', 'error', 'data', 'payload',
  // React types
  'component', 'element', 'node', 'children', 'ref', 'handler',
  'event', 'callback', 'dispatch', 'action', 'reducer', 'store',
  // Common suffixes that aren't entities
  'service', 'controller', 'repository', 'factory', 'builder',
  'helper', 'util', 'utils', 'hook', 'provider', 'consumer',
  // Generic types
  'string', 'number', 'boolean', 'object', 'array', 'function',
  'any', 'unknown', 'void', 'null', 'undefined', 'never',
  'partial', 'required', 'readonly', 'pick', 'omit', 'record',
  'promise', 'async', 'await', 'import', 'export', 'default',
]);

/**
 * Mine entities from a project directory.
 *
 * NOTE: This function does NOT use the MiningCache and scans a subset of directories.
 * For better performance with caching and full directory coverage, use `mineElements()`
 * which implements ARCH-002 (file caching) and ARCH-003 (unified directories).
 *
 * @deprecated Use `mineElements()` instead for caching and full directory coverage.
 * @param projectRoot - Path to the project root directory
 * @param options - Mining options (maxDepth, maxFiles)
 * @returns Array of discovered entities
 */
export async function mineEntities(
  projectRoot: string,
  options: { maxDepth?: number; maxFiles?: number } = {}
): Promise<DiscoveredEntity[]> {
  // SEC-001: Resolve and validate project root
  const resolvedRoot = path.resolve(projectRoot);

  const maxDepth = options.maxDepth ?? MAX_SCAN_DEPTH;
  const maxFiles = options.maxFiles ?? MAX_FILES_TO_SCAN;

  const entityMap = new Map<string, { name: string; sources: string[]; endpoints: string[] }>();
  const fileCount = { count: 0 };

  // Scan common source directories
  const srcDirs = ['src', 'app', 'lib', 'pages', 'components', 'models', 'entities', 'types'];

  for (const dir of srcDirs) {
    const fullPath = path.join(resolvedRoot, dir);
    // SEC-001: Validate path is within project root
    if (!validatePathWithinRoot(resolvedRoot, fullPath)) {continue;}
    if (fs.existsSync(fullPath)) {
      await scanForEntities(fullPath, entityMap, fileCount, 0, maxDepth, maxFiles);
    }
  }

  // Also check prisma schema
  const prismaPath = path.join(projectRoot, 'prisma', 'schema.prisma');
  if (fs.existsSync(prismaPath)) {
    await extractPrismaEntities(prismaPath, entityMap);
  }

  // Convert to DiscoveredEntity array
  return Array.from(entityMap.values()).map(({ name, sources, endpoints }) => {
    const singular = singularize(name);
    const plural = pluralize(singular);
    return {
      name,
      singular,
      plural,
      source: sources[0],
      endpoint: endpoints[0],
    };
  });
}

async function scanForEntities(
  dir: string,
  entityMap: Map<string, { name: string; sources: string[]; endpoints: string[] }>,
  fileCount: { count: number },
  depth: number,
  maxDepth: number,
  maxFiles: number
): Promise<void> {
  if (depth > maxDepth || fileCount.count > maxFiles) {return;}

  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (fileCount.count > maxFiles) {break;}

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'dist' &&
          entry.name !== 'build' &&
          !entry.isSymbolicLink()) {
        await scanForEntities(fullPath, entityMap, fileCount, depth + 1, maxDepth, maxFiles);
      }
    } else if (entry.isFile() && !entry.isSymbolicLink() && SOURCE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      // SEC-003: Skip symlinks to prevent reading arbitrary files
      fileCount.count++;
      try {
        // SEC-002: Skip files that are too large (e.g., minified bundles)
        if (!await isFileSizeWithinLimit(fullPath)) {continue;}
        const content = await fsp.readFile(fullPath, 'utf-8');
        extractEntitiesFromContent(content, fullPath, entityMap);
      } catch {
        // Skip unreadable files
      }
    }
  }
}

function extractEntitiesFromContent(
  content: string,
  source: string,
  entityMap: Map<string, { name: string; sources: string[]; endpoints: string[] }>
): void {
  for (const [patternName, pattern] of Object.entries(ENTITY_PATTERNS)) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    // Determine if this is an API pattern (which extracts plural names)
    const isApiPattern = patternName.includes('api') || patternName.includes('rest') || patternName.includes('fetch');

    let iterations = 0;
    while ((match = pattern.exec(content)) !== null) {
      if (++iterations > MAX_REGEX_ITERATIONS) {break;} // SEC-004: prevent ReDoS
      const rawName = match[1];
      if (!rawName) {continue;}

      // Normalize the name
      const name = rawName.replace(/(?:Model|Entity|Schema|Type|Interface|DTO|Input|Output)$/i, '');
      let normalized = name.toLowerCase();

      // For API patterns, singularize the name (e.g., "users" -> "user")
      if (isApiPattern) {
        normalized = singularize(normalized);
      }

      // Skip exclusions and very short names
      if (ENTITY_EXCLUSIONS.has(normalized) || normalized.length < 3) {continue;}

      // Skip if it looks like a utility type (ends with common suffixes)
      if (/(?:Props|State|Context|Config|Options|Params|Args|Handler|Callback|Service|Controller|Repository)$/i.test(rawName)) {
        continue;
      }

      const existing = entityMap.get(normalized);
      if (existing) {
        if (!existing.sources.includes(source)) {
          existing.sources.push(source);
        }
      } else {
        entityMap.set(normalized, {
          name: normalized,
          sources: [source],
          endpoints: [],
        });
      }

      // If this was an API pattern, also record the endpoint (use plural form for endpoint)
      if (isApiPattern) {
        const entry = entityMap.get(normalized);
        const pluralForm = pluralize(normalized);
        if (entry && !entry.endpoints.includes(`/api/${pluralForm}`)) {
          entry.endpoints.push(`/api/${pluralForm}`);
        }
      }
    }
  }
}

async function extractPrismaEntities(
  prismaPath: string,
  entityMap: Map<string, { name: string; sources: string[]; endpoints: string[] }>
): Promise<void> {
  try {
    const content = await fsp.readFile(prismaPath, 'utf-8');
    const modelPattern = /model\s+(\w+)\s*\{/g;
    let match: RegExpExecArray | null;

    let iterations = 0;
    while ((match = modelPattern.exec(content)) !== null) {
      if (++iterations > MAX_REGEX_ITERATIONS) {break;} // SEC-004
      const name = match[1]!.toLowerCase();
      if (!ENTITY_EXCLUSIONS.has(name) && name.length >= 3) {
        const existing = entityMap.get(name);
        if (existing) {
          if (!existing.sources.includes(prismaPath)) {
            existing.sources.push(prismaPath);
          }
        } else {
          entityMap.set(name, {
            name,
            sources: [prismaPath],
            endpoints: [`/api/${name}`],
          });
        }
      }
    }
  } catch {
    // Skip if unreadable
  }
}

// =============================================================================
// Route Mining
// =============================================================================

/**
 * Patterns to extract routes from code
 */
const ROUTE_PATTERNS = {
  // React Router v6 - BUG-004 FIX: Handle JSX expressions and variable references
  reactRouterPath: /<Route\s+[^>]*path\s*=\s*[{'"]([\w/:.-]+)['"}\s]/gi,
  reactRouterElement: /path:\s*['"]([^'"]+)['"]/g,
  // Route config arrays: { path: '/users', element: <Users /> }
  routeConfigPath: /\{\s*path:\s*['"]([^'"]+)['"][^}]*(?:element|component)/g,

  // React Router useRoutes
  useRoutesPath: /\{\s*path:\s*['"]([^'"]+)['"]/g,

  // Route constants (ROUTES.USERS = '/users')
  routeConstants: /(?:ROUTES|PATHS|routes|paths)\s*[.:=]\s*\{[^}]*(\w+)\s*:\s*['"]([^'"]+)['"]/gi,

  // Next.js pages directory (from file names)
  nextPage: /pages\/(.+?)(?:\/index)?\.(?:tsx?|jsx?)/,

  // Next.js app directory
  nextAppRoute: /app\/(.+?)\/page\.(?:tsx?|jsx?)/,

  // Angular router
  angularPath: /path:\s*['"]([^'"]+)['"],?\s*(?:component|loadComponent|children)/g,

  // Vue Router
  vueRouterPath: /path:\s*['"]([^'"]+)['"],?\s*(?:name|component|components)/g,

  // Express/Fastify routes
  expressRoute: /(?:app|router)\.(?:get|post|put|delete|patch|all)\s*\(\s*['"]([^'"]+)['"]/gi,

  // NestJS routes
  nestRoute: /@(?:Get|Post|Put|Delete|Patch|All)\s*\(\s*['"]?([^'")\s]*)/gi,
};

/**
 * Mine routes from a project directory.
 *
 * NOTE: This function does NOT use the MiningCache and scans a subset of directories.
 * For better performance with caching and full directory coverage, use `mineElements()`
 * which implements ARCH-002 (file caching) and ARCH-003 (unified directories).
 *
 * @deprecated Use `mineElements()` instead for caching and full directory coverage.
 * @param projectRoot - Path to the project root directory
 * @param options - Mining options (maxDepth, maxFiles)
 * @returns Array of discovered routes
 */
export async function mineRoutes(
  projectRoot: string,
  options: { maxDepth?: number; maxFiles?: number } = {}
): Promise<DiscoveredRoute[]> {
  // SEC-001: Resolve and validate project root
  const resolvedRoot = path.resolve(projectRoot);

  const maxDepth = options.maxDepth ?? MAX_SCAN_DEPTH;
  const maxFiles = options.maxFiles ?? MAX_FILES_TO_SCAN;

  const routeMap = new Map<string, DiscoveredRoute>();
  const fileCount = { count: 0 };

  // Scan source directories
  const srcDirs = ['src', 'app', 'pages', 'routes', 'views'];

  for (const dir of srcDirs) {
    const fullPath = path.join(resolvedRoot, dir);
    // SEC-001: Validate path is within project root
    if (!validatePathWithinRoot(resolvedRoot, fullPath)) {continue;}
    if (fs.existsSync(fullPath)) {
      await scanForRoutes(fullPath, routeMap, fileCount, 0, maxDepth, maxFiles);
    }
  }

  // Check for Next.js pages directory structure
  const pagesDir = path.join(resolvedRoot, 'pages');
  if (validatePathWithinRoot(resolvedRoot, pagesDir) && fs.existsSync(pagesDir)) {
    await extractNextJsPages(pagesDir, routeMap, '');
  }

  // Check for Next.js app directory structure
  const appDir = path.join(resolvedRoot, 'app');
  if (validatePathWithinRoot(resolvedRoot, appDir) && fs.existsSync(appDir)) {
    await extractNextJsAppRoutes(appDir, routeMap, '');
  }

  return Array.from(routeMap.values());
}

async function scanForRoutes(
  dir: string,
  routeMap: Map<string, DiscoveredRoute>,
  fileCount: { count: number },
  depth: number,
  maxDepth: number,
  maxFiles: number
): Promise<void> {
  if (depth > maxDepth || fileCount.count > maxFiles) {return;}

  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (fileCount.count > maxFiles) {break;}

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'dist' &&
          entry.name !== 'build' &&
          !entry.isSymbolicLink()) {
        await scanForRoutes(fullPath, routeMap, fileCount, depth + 1, maxDepth, maxFiles);
      }
    } else if (entry.isFile() && !entry.isSymbolicLink() && SOURCE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      // SEC-003: Skip symlinks to prevent reading arbitrary files
      fileCount.count++;
      try {
        // SEC-002: Skip files that are too large
        if (!await isFileSizeWithinLimit(fullPath)) {continue;}
        const content = await fsp.readFile(fullPath, 'utf-8');
        extractRoutesFromContent(content, fullPath, routeMap);
      } catch {
        // Skip unreadable files
      }
    }
  }
}

function extractRoutesFromContent(
  content: string,
  source: string,
  routeMap: Map<string, DiscoveredRoute>
): void {
  for (const pattern of Object.values(ROUTE_PATTERNS)) {
    if (typeof pattern === 'function') {continue;} // Skip non-regex patterns

    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    let iterations = 0;
    while ((match = pattern.exec(content)) !== null) {
      if (++iterations > MAX_REGEX_ITERATIONS) {break;} // SEC-004
      const routePath = match[1];
      if (!routePath || routePath === '*' || routePath === '**') {continue;}

      // Normalize path
      const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`;

      // Skip API routes (focus on UI routes)
      if (normalizedPath.startsWith('/api/')) {continue;}

      // Extract route name from path
      const name = pathToName(normalizedPath);

      // Extract parameters
      const params = extractRouteParams(normalizedPath);

      if (!routeMap.has(normalizedPath)) {
        routeMap.set(normalizedPath, {
          path: normalizedPath,
          name,
          params: params.length > 0 ? params : undefined,
          component: source,
        });
      }
    }
  }
}

async function extractNextJsPages(
  dir: string,
  routeMap: Map<string, DiscoveredRoute>,
  basePath: string
): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('_') && !entry.name.startsWith('.')) {
        // Handle dynamic routes [param]
        const segment = entry.name.startsWith('[') && entry.name.endsWith(']')
          ? `:${entry.name.slice(1, -1)}`
          : entry.name;
        await extractNextJsPages(fullPath, routeMap, `${basePath}/${segment}`);
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      const base = path.basename(entry.name, ext);

      if (['.tsx', '.ts', '.jsx', '.js'].includes(ext) && !base.startsWith('_')) {
        let routePath: string;
        if (base === 'index') {
          routePath = basePath || '/';
        } else if (base.startsWith('[') && base.endsWith(']')) {
          routePath = `${basePath}/:${base.slice(1, -1)}`;
        } else {
          routePath = `${basePath}/${base}`;
        }

        const name = pathToName(routePath);
        const params = extractRouteParams(routePath);

        routeMap.set(routePath, {
          path: routePath,
          name,
          params: params.length > 0 ? params : undefined,
          component: fullPath,
        });
      }
    }
  }
}

async function extractNextJsAppRoutes(
  dir: string,
  routeMap: Map<string, DiscoveredRoute>,
  basePath: string
): Promise<void> {
  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('_') && !entry.name.startsWith('.')) {
        // Handle dynamic routes [param] and groups (group)
        let segment: string;
        if (entry.name.startsWith('(') && entry.name.endsWith(')')) {
          segment = ''; // Route groups don't add to path
        } else if (entry.name.startsWith('[') && entry.name.endsWith(']')) {
          segment = `:${entry.name.slice(1, -1)}`;
        } else {
          segment = entry.name;
        }
        const newPath = segment ? `${basePath}/${segment}` : basePath;
        await extractNextJsAppRoutes(fullPath, routeMap, newPath);
      }
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts' ||
               entry.name === 'page.jsx' || entry.name === 'page.js') {
      const routePath = basePath || '/';
      const name = pathToName(routePath);
      const params = extractRouteParams(routePath);

      routeMap.set(routePath, {
        path: routePath,
        name,
        params: params.length > 0 ? params : undefined,
        component: fullPath,
      });
    }
  }
}

function pathToName(routePath: string): string {
  if (routePath === '/') {return 'Home';}

  const segments = routePath.split('/').filter(s => s && !s.startsWith(':'));
  if (segments.length === 0) {return 'Home';}

  // Convert last segment to title case
  const lastSegment = segments[segments.length - 1]!;
  return lastSegment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function extractRouteParams(routePath: string): string[] {
  const params: string[] = [];
  const paramPattern = /:(\w+)/g;
  let match: RegExpExecArray | null;

  let iterations = 0;
  while ((match = paramPattern.exec(routePath)) !== null) {
    if (++iterations > MAX_REGEX_ITERATIONS) {break;} // SEC-004
    params.push(match[1]!);
  }

  return params;
}

// =============================================================================
// Form Mining
// =============================================================================

/**
 * Patterns to extract forms from code
 */
const FORM_PATTERNS = {
  // Zod schema - SEC-F01 FIX: Bounded match (max 2000 chars) to prevent ReDoS.
  // Uses [\s\S]{0,2000}? lazy quantifier with length cap (supports nested braces).
  zodSchema: /z\.object\s*\(\s*\{([\s\S]{0,2000}?)\}\s*\)/g,
  // BUG-003 FIX: Handle chained methods like z.string().email().min(1)
  // SEC-F01 FIX: Limit chained methods to max 5 to prevent backtracking
  zodField: /(\w+)\s*:\s*z\.(\w+)(?:\([^)]*\))?(?:\.\w+(?:\([^)]*\))?){0,5}/g,

  // Yup schema - same SEC-F01 fixes applied (bounded lazy match, supports nested braces)
  yupSchema: /(?:yup|Yup)\.object\s*\(\s*\{([\s\S]{0,2000}?)\}\s*\)/g,
  yupField: /(\w+)\s*:\s*(?:yup|Yup)\.(\w+)(?:\([^)]*\))?(?:\.\w+(?:\([^)]*\))?){0,5}/g,

  // React Hook Form
  rhfRegister: /register\s*\(\s*['"](\w+)['"]/g,
  rhfControl: /name:\s*['"](\w+)['"]/g,

  // Formik Field
  formikField: /<Field\s+[^>]*name\s*=\s*['"]([\w.]+)['"]/gi,
  formikInitial: /initialValues\s*[:=]\s*\{([^}]+)\}/g,

  // HTML form elements - BUG-005 FIX: Handle attributes in any order
  // Pattern 1: name before type
  htmlInputNameFirst: /<input[^>]+name\s*=\s*['"](\w+)['"][^>]*(?:type\s*=\s*['"](\w+)['"])?/gi,
  // Pattern 2: type before name
  htmlInputTypeFirst: /<input[^>]+type\s*=\s*['"](\w+)['"][^>]+name\s*=\s*['"](\w+)['"]/gi,
  htmlSelect: /<select[^>]+name\s*=\s*['"](\w+)['"]/gi,
  htmlTextarea: /<textarea[^>]+name\s*=\s*['"](\w+)['"]/gi,

  // Form component patterns
  formComponent: /(?:Form|form)\s*(?:name|id)\s*=\s*['"](\w+)['"]/gi,
};

/**
 * Mine forms from a project directory.
 *
 * NOTE: This function does NOT use the MiningCache and scans a subset of directories.
 * For better performance with caching and full directory coverage, use `mineElements()`
 * which implements ARCH-002 (file caching) and ARCH-003 (unified directories).
 *
 * @deprecated Use `mineElements()` instead for caching and full directory coverage.
 * @param projectRoot - Path to the project root directory
 * @param options - Mining options (maxDepth, maxFiles)
 * @returns Array of discovered forms
 */
export async function mineForms(
  projectRoot: string,
  options: { maxDepth?: number; maxFiles?: number } = {}
): Promise<DiscoveredForm[]> {
  // SEC-001: Resolve and validate project root
  const resolvedRoot = path.resolve(projectRoot);

  const maxDepth = options.maxDepth ?? MAX_SCAN_DEPTH;
  const maxFiles = options.maxFiles ?? MAX_FILES_TO_SCAN;

  const formMap = new Map<string, DiscoveredForm>();
  const fileCount = { count: 0 };

  // Scan source directories
  const srcDirs = ['src', 'app', 'components', 'forms', 'schemas', 'validation'];

  for (const dir of srcDirs) {
    const fullPath = path.join(resolvedRoot, dir);
    // SEC-001: Validate path is within project root
    if (!validatePathWithinRoot(resolvedRoot, fullPath)) {continue;}
    if (fs.existsSync(fullPath)) {
      await scanForForms(fullPath, formMap, fileCount, 0, maxDepth, maxFiles);
    }
  }

  return Array.from(formMap.values());
}

async function scanForForms(
  dir: string,
  formMap: Map<string, DiscoveredForm>,
  fileCount: { count: number },
  depth: number,
  maxDepth: number,
  maxFiles: number
): Promise<void> {
  if (depth > maxDepth || fileCount.count > maxFiles) {return;}

  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (fileCount.count > maxFiles) {break;}

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'dist' &&
          entry.name !== 'build' &&
          !entry.isSymbolicLink()) {
        await scanForForms(fullPath, formMap, fileCount, depth + 1, maxDepth, maxFiles);
      }
    } else if (entry.isFile() && !entry.isSymbolicLink() && SOURCE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      // SEC-003: Skip symlinks to prevent reading arbitrary files
      fileCount.count++;
      try {
        // SEC-002: Skip files that are too large
        if (!await isFileSizeWithinLimit(fullPath)) {continue;}
        const content = await fsp.readFile(fullPath, 'utf-8');
        extractFormsFromContent(content, fullPath, formMap);
      } catch {
        // Skip unreadable files
      }
    }
  }
}

function extractFormsFromContent(
  content: string,
  source: string,
  formMap: Map<string, DiscoveredForm>
): void {
  // Try to extract form name from filename
  const fileName = path.basename(source, path.extname(source));
  const formNameFromFile = fileName.replace(/(?:Form|Schema|Validation)$/i, '');

  const fields: FormField[] = [];

  // Extract Zod fields
  const zodMatch = FORM_PATTERNS.zodSchema.exec(content);
  if (zodMatch) {
    FORM_PATTERNS.zodField.lastIndex = 0;
    let fieldMatch: RegExpExecArray | null;
    let fieldIter = 0;
    while ((fieldMatch = FORM_PATTERNS.zodField.exec(zodMatch[1]!)) !== null) {
      if (++fieldIter > MAX_REGEX_ITERATIONS) {break;} // SEC-004
      fields.push({
        name: fieldMatch[1]!,
        type: zodTypeToHtmlType(fieldMatch[2]!),
        label: fieldNameToLabel(fieldMatch[1]!),
      });
    }
    FORM_PATTERNS.zodSchema.lastIndex = 0;
  }

  // Extract Yup fields
  const yupMatch = FORM_PATTERNS.yupSchema.exec(content);
  if (yupMatch) {
    FORM_PATTERNS.yupField.lastIndex = 0;
    let fieldMatch: RegExpExecArray | null;
    let yupIter = 0;
    while ((fieldMatch = FORM_PATTERNS.yupField.exec(yupMatch[1]!)) !== null) {
      if (++yupIter > MAX_REGEX_ITERATIONS) {break;} // SEC-004
      const existingField = fields.find(f => f.name === fieldMatch![1]!);
      if (!existingField) {
        fields.push({
          name: fieldMatch[1]!,
          type: yupTypeToHtmlType(fieldMatch[2]!),
          label: fieldNameToLabel(fieldMatch[1]!),
        });
      }
    }
    FORM_PATTERNS.yupSchema.lastIndex = 0;
  }

  // Extract React Hook Form fields
  FORM_PATTERNS.rhfRegister.lastIndex = 0;
  let rhfMatch: RegExpExecArray | null;
  let rhfIter = 0;
  while ((rhfMatch = FORM_PATTERNS.rhfRegister.exec(content)) !== null) {
    if (++rhfIter > MAX_REGEX_ITERATIONS) {break;} // SEC-004
    const existingField = fields.find(f => f.name === rhfMatch![1]!);
    if (!existingField) {
      fields.push({
        name: rhfMatch[1]!,
        type: 'text',
        label: fieldNameToLabel(rhfMatch[1]!),
      });
    }
  }

  // Extract HTML input fields - BUG-005 FIX: Check both attribute orders
  // Pattern 1: name before type
  FORM_PATTERNS.htmlInputNameFirst.lastIndex = 0;
  let htmlMatch: RegExpExecArray | null;
  let htmlIter = 0;
  while ((htmlMatch = FORM_PATTERNS.htmlInputNameFirst.exec(content)) !== null) {
    if (++htmlIter > MAX_REGEX_ITERATIONS) {break;} // SEC-004
    const existingField = fields.find(f => f.name === htmlMatch![1]!);
    if (!existingField) {
      fields.push({
        name: htmlMatch[1]!,
        type: htmlMatch[2] || 'text',
        label: fieldNameToLabel(htmlMatch[1]!),
      });
    }
  }

  // Pattern 2: type before name
  FORM_PATTERNS.htmlInputTypeFirst.lastIndex = 0;
  let htmlIter2 = 0;
  while ((htmlMatch = FORM_PATTERNS.htmlInputTypeFirst.exec(content)) !== null) {
    if (++htmlIter2 > MAX_REGEX_ITERATIONS) {break;} // SEC-004
    // Note: capture groups are reversed - [1]=type, [2]=name
    const existingField = fields.find(f => f.name === htmlMatch![2]!);
    if (!existingField) {
      fields.push({
        name: htmlMatch[2]!,
        type: htmlMatch[1]! || 'text',
        label: fieldNameToLabel(htmlMatch[2]!),
      });
    }
  }

  // Only add form if we found fields
  if (fields.length > 0) {
    const formId = formNameFromFile.toLowerCase();
    const formName = fieldNameToLabel(formNameFromFile);

    if (!formMap.has(formId)) {
      formMap.set(formId, {
        id: formId,
        name: formName,
        fields,
        schema: source,
      });
    }
  }
}

function zodTypeToHtmlType(zodType: string): string {
  const typeMap: Record<string, string> = {
    string: 'text',
    email: 'email',
    number: 'number',
    boolean: 'checkbox',
    date: 'date',
    enum: 'select',
    password: 'password',
  };
  return typeMap[zodType.toLowerCase()] || 'text';
}

function yupTypeToHtmlType(yupType: string): string {
  const typeMap: Record<string, string> = {
    string: 'text',
    email: 'email',
    number: 'number',
    boolean: 'checkbox',
    date: 'date',
    mixed: 'text',
  };
  return typeMap[yupType.toLowerCase()] || 'text';
}

function fieldNameToLabel(fieldName: string): string {
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

// =============================================================================
// Table Mining
// =============================================================================

/**
 * Patterns to extract tables from code
 */
const TABLE_PATTERNS = {
  // AG Grid
  agGridColumns: /columnDefs\s*[:=]\s*\[([^\]]+)\]/gs,
  agGridField: /field:\s*['"](\w+)['"]/g,
  agGridHeader: /headerName:\s*['"]([^'"]+)['"]/g,

  // TanStack Table / React Table
  tanstackColumn: /accessorKey:\s*['"](\w+)['"]/g,
  tanstackHeader: /header:\s*['"]([^'"]+)['"]/g,

  // MUI DataGrid
  muiColumns: /columns\s*[:=]\s*\[([^\]]+)\]/gs,
  muiField: /field:\s*['"](\w+)['"]/g,
  muiHeader: /headerName:\s*['"]([^'"]+)['"]/g,

  // HTML table
  htmlTh: /<th[^>]*>([^<]+)<\/th>/gi,
  htmlTable: /<table[^>]*(?:id|class)\s*=\s*['"]([^'"]+)['"]/gi,

  // Ant Design Table
  antdDataIndex: /dataIndex:\s*['"](\w+)['"]/g,
  antdTitle: /title:\s*['"]([^'"]+)['"]/g,
};

/**
 * Mine tables from a project directory.
 *
 * NOTE: This function does NOT use the MiningCache and scans a subset of directories.
 * For better performance with caching and full directory coverage, use `mineElements()`
 * which implements ARCH-002 (file caching) and ARCH-003 (unified directories).
 *
 * @deprecated Use `mineElements()` instead for caching and full directory coverage.
 * @param projectRoot - Path to the project root directory
 * @param options - Mining options (maxDepth, maxFiles)
 * @returns Array of discovered tables
 */
export async function mineTables(
  projectRoot: string,
  options: { maxDepth?: number; maxFiles?: number } = {}
): Promise<DiscoveredTable[]> {
  // SEC-001: Resolve and validate project root
  const resolvedRoot = path.resolve(projectRoot);

  const maxDepth = options.maxDepth ?? MAX_SCAN_DEPTH;
  const maxFiles = options.maxFiles ?? MAX_FILES_TO_SCAN;

  const tableMap = new Map<string, DiscoveredTable>();
  const fileCount = { count: 0 };

  // Scan source directories
  const srcDirs = ['src', 'app', 'components', 'tables', 'grids', 'views'];

  for (const dir of srcDirs) {
    const fullPath = path.join(resolvedRoot, dir);
    // SEC-001: Validate path is within project root
    if (!validatePathWithinRoot(resolvedRoot, fullPath)) {continue;}
    if (fs.existsSync(fullPath)) {
      await scanForTables(fullPath, tableMap, fileCount, 0, maxDepth, maxFiles);
    }
  }

  return Array.from(tableMap.values());
}

async function scanForTables(
  dir: string,
  tableMap: Map<string, DiscoveredTable>,
  fileCount: { count: number },
  depth: number,
  maxDepth: number,
  maxFiles: number
): Promise<void> {
  if (depth > maxDepth || fileCount.count > maxFiles) {return;}

  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (fileCount.count > maxFiles) {break;}

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'dist' &&
          entry.name !== 'build' &&
          !entry.isSymbolicLink()) {
        await scanForTables(fullPath, tableMap, fileCount, depth + 1, maxDepth, maxFiles);
      }
    } else if (entry.isFile() && !entry.isSymbolicLink() && SOURCE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      // SEC-003: Skip symlinks to prevent reading arbitrary files
      fileCount.count++;
      try {
        // SEC-002: Skip files that are too large
        if (!await isFileSizeWithinLimit(fullPath)) {continue;}
        const content = await fsp.readFile(fullPath, 'utf-8');
        extractTablesFromContent(content, fullPath, tableMap);
      } catch {
        // Skip unreadable files
      }
    }
  }
}

function extractTablesFromContent(
  content: string,
  source: string,
  tableMap: Map<string, DiscoveredTable>
): void {
  const fileName = path.basename(source, path.extname(source));
  const tableNameFromFile = fileName.replace(/(?:Table|Grid|List|DataGrid)$/i, '');

  const columns: string[] = [];

  // Check if file contains table-related imports
  const hasTableImport = /(?:AgGridReact|DataGrid|useReactTable|Table)/i.test(content);
  if (!hasTableImport && !/<table/i.test(content)) {
    return;
  }

  // Extract AG Grid / MUI DataGrid columns
  const columnDefsMatch = TABLE_PATTERNS.agGridColumns.exec(content) ||
                          TABLE_PATTERNS.muiColumns.exec(content);
  if (columnDefsMatch) {
    TABLE_PATTERNS.agGridField.lastIndex = 0;
    TABLE_PATTERNS.muiField.lastIndex = 0;
    let fieldMatch: RegExpExecArray | null;
    let colIter = 0;

    while ((fieldMatch = TABLE_PATTERNS.agGridField.exec(columnDefsMatch[1]!)) !== null) {
      if (++colIter > MAX_REGEX_ITERATIONS) {break;} // SEC-004
      if (!columns.includes(fieldMatch[1]!)) {
        columns.push(fieldMatch[1]!);
      }
    }
    colIter = 0;
    while ((fieldMatch = TABLE_PATTERNS.muiField.exec(columnDefsMatch[1]!)) !== null) {
      if (++colIter > MAX_REGEX_ITERATIONS) {break;} // SEC-004
      if (!columns.includes(fieldMatch[1]!)) {
        columns.push(fieldMatch[1]!);
      }
    }
    TABLE_PATTERNS.agGridColumns.lastIndex = 0;
    TABLE_PATTERNS.muiColumns.lastIndex = 0;
  }

  // Extract TanStack Table columns
  TABLE_PATTERNS.tanstackColumn.lastIndex = 0;
  let tanstackMatch: RegExpExecArray | null;
  let tanstackIter = 0;
  while ((tanstackMatch = TABLE_PATTERNS.tanstackColumn.exec(content)) !== null) {
    if (++tanstackIter > MAX_REGEX_ITERATIONS) {break;} // SEC-004
    if (!columns.includes(tanstackMatch[1]!)) {
      columns.push(tanstackMatch[1]!);
    }
  }

  // Extract Ant Design columns
  TABLE_PATTERNS.antdDataIndex.lastIndex = 0;
  let antdMatch: RegExpExecArray | null;
  let antdIter = 0;
  while ((antdMatch = TABLE_PATTERNS.antdDataIndex.exec(content)) !== null) {
    if (++antdIter > MAX_REGEX_ITERATIONS) {break;} // SEC-004
    if (!columns.includes(antdMatch[1]!)) {
      columns.push(antdMatch[1]!);
    }
  }

  // Extract HTML table headers
  TABLE_PATTERNS.htmlTh.lastIndex = 0;
  let thMatch: RegExpExecArray | null;
  let thIter = 0;
  while ((thMatch = TABLE_PATTERNS.htmlTh.exec(content)) !== null) {
    if (++thIter > MAX_REGEX_ITERATIONS) {break;} // SEC-004
    const header = thMatch[1]!.trim();
    if (header && !columns.includes(header)) {
      columns.push(header);
    }
  }

  // Only add table if we found columns
  if (columns.length > 0) {
    const tableId = tableNameFromFile.toLowerCase();
    const tableName = fieldNameToLabel(tableNameFromFile);

    if (!tableMap.has(tableId)) {
      tableMap.set(tableId, {
        id: tableId,
        name: tableName || 'Data Table',
        columns,
      });
    }
  }
}

// =============================================================================
// Modal Mining
// =============================================================================

/**
 * Patterns to extract modals from code
 */
const MODAL_PATTERNS = {
  // MUI Dialog
  muiDialog: /<Dialog[^>]*(?:open|onClose)[^>]*>/gi,
  muiDialogTitle: /<DialogTitle[^>]*>([^<]+)<\/DialogTitle>/gi,

  // Radix Dialog
  radixDialog: /<Dialog\.Root/gi,
  radixDialogTitle: /<Dialog\.Title[^>]*>([^<]+)<\/Dialog\.Title>/gi,

  // React Modal
  reactModal: /<Modal[^>]*(?:isOpen|onRequestClose)[^>]*>/gi,

  // Chakra Modal
  chakraModal: /<Modal[^>]*(?:isOpen|onClose)[^>]*>/gi,
  chakraModalHeader: /<ModalHeader[^>]*>([^<]+)<\/ModalHeader>/gi,

  // Ant Design Modal
  antdModal: /<Modal[^>]*(?:open|visible|onCancel)[^>]*>/gi,
  antdModalTitle: /title\s*=\s*[{'"]([\w\s]+)['"}]/gi,

  // Generic modal patterns
  modalComponent: /(?:Modal|Dialog|Popup|Overlay)\s*(?:name|id|title)\s*=\s*['"](\w+)['"]/gi,
  openModal: /(?:open|show|toggle)(?:Modal|Dialog)\s*\(\s*['"]?(\w+)/gi,
};

/**
 * Mine modals from a project directory.
 *
 * NOTE: This function does NOT use the MiningCache and scans a subset of directories.
 * For better performance with caching and full directory coverage, use `mineElements()`
 * which implements ARCH-002 (file caching) and ARCH-003 (unified directories).
 *
 * @deprecated Use `mineElements()` instead for caching and full directory coverage.
 * @param projectRoot - Path to the project root directory
 * @param options - Mining options (maxDepth, maxFiles)
 * @returns Array of discovered modals
 */
export async function mineModals(
  projectRoot: string,
  options: { maxDepth?: number; maxFiles?: number } = {}
): Promise<DiscoveredModal[]> {
  // SEC-001: Resolve and validate project root
  const resolvedRoot = path.resolve(projectRoot);

  const maxDepth = options.maxDepth ?? MAX_SCAN_DEPTH;
  const maxFiles = options.maxFiles ?? MAX_FILES_TO_SCAN;

  const modalMap = new Map<string, DiscoveredModal>();
  const fileCount = { count: 0 };

  // Scan source directories
  const srcDirs = ['src', 'app', 'components', 'modals', 'dialogs'];

  for (const dir of srcDirs) {
    const fullPath = path.join(resolvedRoot, dir);
    // SEC-001: Validate path is within project root
    if (!validatePathWithinRoot(resolvedRoot, fullPath)) {continue;}
    if (fs.existsSync(fullPath)) {
      await scanForModals(fullPath, modalMap, fileCount, 0, maxDepth, maxFiles);
    }
  }

  return Array.from(modalMap.values());
}

async function scanForModals(
  dir: string,
  modalMap: Map<string, DiscoveredModal>,
  fileCount: { count: number },
  depth: number,
  maxDepth: number,
  maxFiles: number
): Promise<void> {
  if (depth > maxDepth || fileCount.count > maxFiles) {return;}

  let entries: fs.Dirent[];
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (fileCount.count > maxFiles) {break;}

    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'dist' &&
          entry.name !== 'build' &&
          !entry.isSymbolicLink()) {
        await scanForModals(fullPath, modalMap, fileCount, depth + 1, maxDepth, maxFiles);
      }
    } else if (entry.isFile() && !entry.isSymbolicLink() && SOURCE_EXTENSIONS.some(ext => entry.name.endsWith(ext))) {
      // SEC-003: Skip symlinks to prevent reading arbitrary files
      fileCount.count++;
      try {
        // SEC-002: Skip files that are too large
        if (!await isFileSizeWithinLimit(fullPath)) {continue;}
        const content = await fsp.readFile(fullPath, 'utf-8');
        extractModalsFromContent(content, fullPath, modalMap);
      } catch {
        // Skip unreadable files
      }
    }
  }
}

function extractModalsFromContent(
  content: string,
  source: string,
  modalMap: Map<string, DiscoveredModal>
): void {
  const fileName = path.basename(source, path.extname(source));
  const modalNameFromFile = fileName.replace(/(?:Modal|Dialog|Popup)$/i, '');

  // Check if file contains modal-related patterns
  const hasModal = Object.values(MODAL_PATTERNS).some(pattern => {
    pattern.lastIndex = 0;
    return pattern.test(content);
  });

  if (!hasModal) {return;}

  // Try to extract modal title
  let modalTitle: string | undefined;

  // Check MUI Dialog title
  MODAL_PATTERNS.muiDialogTitle.lastIndex = 0;
  const muiTitleMatch = MODAL_PATTERNS.muiDialogTitle.exec(content);
  if (muiTitleMatch) {
    modalTitle = muiTitleMatch[1]!.trim();
  }

  // Check Chakra modal header
  if (!modalTitle) {
    MODAL_PATTERNS.chakraModalHeader.lastIndex = 0;
    const chakraTitleMatch = MODAL_PATTERNS.chakraModalHeader.exec(content);
    if (chakraTitleMatch) {
      modalTitle = chakraTitleMatch[1]!.trim();
    }
  }

  // Check Ant Design title
  if (!modalTitle) {
    MODAL_PATTERNS.antdModalTitle.lastIndex = 0;
    const antdTitleMatch = MODAL_PATTERNS.antdModalTitle.exec(content);
    if (antdTitleMatch) {
      modalTitle = antdTitleMatch[1]!.trim();
    }
  }

  const modalId = modalNameFromFile.toLowerCase();
  const modalName = modalTitle || fieldNameToLabel(modalNameFromFile) || 'Modal';

  if (!modalMap.has(modalId) && modalId) {
    modalMap.set(modalId, {
      id: modalId,
      name: modalName,
    });
  }
}

// =============================================================================
// ARCH-002/003: Internal extraction from pre-scanned files
// =============================================================================

/**
 * Extract entities from pre-scanned files (internal, uses cache).
 */
function extractEntitiesFromFiles(
  files: ScannedFile[],
  entityMap: Map<string, { name: string; sources: string[]; endpoints: string[] }>
): void {
  for (const file of files) {
    extractEntitiesFromContent(file.content, file.path, entityMap);
  }
}

/**
 * Extract routes from pre-scanned files (internal, uses cache).
 */
function extractRoutesFromFiles(
  files: ScannedFile[],
  routeMap: Map<string, DiscoveredRoute>
): void {
  for (const file of files) {
    extractRoutesFromContent(file.content, file.path, routeMap);
  }
}

/**
 * Extract forms from pre-scanned files (internal, uses cache).
 */
function extractFormsFromFiles(
  files: ScannedFile[],
  formMap: Map<string, DiscoveredForm>
): void {
  for (const file of files) {
    extractFormsFromContent(file.content, file.path, formMap);
  }
}

/**
 * Extract tables from pre-scanned files (internal, uses cache).
 */
function extractTablesFromFiles(
  files: ScannedFile[],
  tableMap: Map<string, DiscoveredTable>
): void {
  for (const file of files) {
    extractTablesFromContent(file.content, file.path, tableMap);
  }
}

/**
 * Extract modals from pre-scanned files (internal, uses cache).
 */
function extractModalsFromFiles(
  files: ScannedFile[],
  modalMap: Map<string, DiscoveredModal>
): void {
  for (const file of files) {
    extractModalsFromContent(file.content, file.path, modalMap);
  }
}

// =============================================================================
// Main Mining Function
// =============================================================================

/**
 * Result of mining operation
 */
export interface MiningResult {
  elements: DiscoveredElements;
  stats: {
    entitiesFound: number;
    routesFound: number;
    formsFound: number;
    tablesFound: number;
    modalsFound: number;
    totalElements: number;
    filesScanned: number;
    /** Cache statistics (ARCH-002) */
    cacheHits?: number;
    cacheMisses?: number;
    cacheHitRate?: number;
  };
  duration: number;
}

/**
 * Mine all discoverable elements from a project
 *
 * This is the main entry point for zero-config pattern generation.
 * It scans the project for entities, routes, forms, tables, and modals,
 * then returns them in a format suitable for template multiplication.
 *
 * ARCH-002: Uses shared MiningCache to scan files only once
 * ARCH-003: Uses SOURCE_DIRECTORIES for consistent coverage
 *
 * @param projectRoot - Path to the project root directory
 * @param options - Mining options (maxDepth, maxFiles)
 * @returns Mining result with discovered elements and statistics
 */
export async function mineElements(
  projectRoot: string,
  options: { maxDepth?: number; maxFiles?: number } = {}
): Promise<MiningResult> {
  const startTime = Date.now();
  const resolvedRoot = path.resolve(projectRoot);

  // ARCH-002: Create shared cache for all mining operations
  const cache = new MiningCache();

  try {
    // ARCH-003: Scan all source directories ONCE using unified list
    const files = await scanAllSourceDirectories(resolvedRoot, cache, {
      maxDepth: options.maxDepth ?? MAX_SCAN_DEPTH,
      maxFiles: options.maxFiles ?? MAX_FILES_TO_SCAN,
    });

    // Create maps for each element type
    const entityMap = new Map<string, { name: string; sources: string[]; endpoints: string[] }>();
    const routeMap = new Map<string, DiscoveredRoute>();
    const formMap = new Map<string, DiscoveredForm>();
    const tableMap = new Map<string, DiscoveredTable>();
    const modalMap = new Map<string, DiscoveredModal>();

    // Extract all elements from the pre-scanned files (parallel-safe since maps are independent)
    extractEntitiesFromFiles(files, entityMap);
    extractRoutesFromFiles(files, routeMap);
    extractFormsFromFiles(files, formMap);
    extractTablesFromFiles(files, tableMap);
    extractModalsFromFiles(files, modalMap);

    // Also check Prisma schema (special case, not in source files)
    const prismaPath = path.join(resolvedRoot, 'prisma', 'schema.prisma');
    if (fs.existsSync(prismaPath)) {
      await extractPrismaEntities(prismaPath, entityMap);
    }

    // Check Next.js file-based routing (special case)
    const pagesDir = path.join(resolvedRoot, 'pages');
    if (validatePathWithinRoot(resolvedRoot, pagesDir) && fs.existsSync(pagesDir)) {
      await extractNextJsPages(pagesDir, routeMap, '');
    }
    const appDir = path.join(resolvedRoot, 'app');
    if (validatePathWithinRoot(resolvedRoot, appDir) && fs.existsSync(appDir)) {
      await extractNextJsAppRoutes(appDir, routeMap, '');
    }

    // Convert maps to arrays
    const entities = Array.from(entityMap.values()).map(({ name, sources, endpoints }) => {
      const singular = singularize(name);
      const plural = pluralize(singular);
      return {
        name,
        singular,
        plural,
        source: sources[0],
        endpoint: endpoints[0],
      };
    });
    const routes = Array.from(routeMap.values());
    const forms = Array.from(formMap.values());
    const tables = Array.from(tableMap.values());
    const modals = Array.from(modalMap.values());

    const elements: DiscoveredElements = {
      entities,
      routes,
      forms,
      tables,
      modals,
    };

    // Get cache statistics
    const cacheStats = cache.getStats();
    const duration = Date.now() - startTime;

    return {
      elements,
      stats: {
        entitiesFound: entities.length,
        routesFound: routes.length,
        formsFound: forms.length,
        tablesFound: tables.length,
        modalsFound: modals.length,
        totalElements: entities.length + routes.length + forms.length + tables.length + modals.length,
        filesScanned: files.length,
        // ARCH-002: Include cache statistics
        cacheHits: cacheStats.hits,
        cacheMisses: cacheStats.misses,
        cacheHitRate: cache.getHitRate(),
      },
      duration,
    };
  } finally {
    // ARCH-002: Always clear cache to free memory
    cache.clear();
  }
}

/**
 * Run full discovery pipeline: mine elements + generate patterns
 *
 * This combines mining with pattern generation for a complete
 * zero-config experience.
 *
 * @param projectRoot - Path to the project root directory
 * @param options - Mining and generation options
 * @returns Combined mining and generation results
 */
export async function runMiningPipeline(
  projectRoot: string,
  options: { maxDepth?: number; maxFiles?: number; confidence?: number } = {}
): Promise<{
  mining: MiningResult;
  patterns: GenerationResult;
}> {
  // Import generateAllPatterns dynamically to avoid circular dependencies
  const { generateAllPatterns } = await import('./template-generators.js');

  // Mine all elements
  const mining = await mineElements(projectRoot, options);

  // Generate patterns from mined elements
  const patterns = generateAllPatterns(mining.elements, options.confidence);

  return {
    mining,
    patterns,
  };
}
