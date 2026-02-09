/**
 * LLKB Mining Cache Module
 *
 * Provides file content caching and unified directory configuration
 * for mining operations to eliminate redundant file I/O.
 *
 * ARCH-002: File caching reduces I/O by ~5x
 * ARCH-003: Unified directory scanning ensures no elements are missed
 *
 * Security: Validates mtime to prevent stale content, implements memory limits.
 *
 * @module llkb/mining-cache
 */

import type * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';

// =============================================================================
// Constants
// =============================================================================

/** Maximum file size to cache (5MB) */
const MAX_CACHE_FILE_SIZE = 5 * 1024 * 1024;

/** Maximum number of files to cache */
const MAX_CACHED_FILES = 5000;

/** Maximum total memory for cache (100MB — fits CI/CD; typical source < 50MB) */
const MAX_CACHE_MEMORY = 100 * 1024 * 1024;

/** Percentage of cache to evict when full */
const EVICTION_BATCH_PERCENT = 0.1;

/**
 * V8 string memory overhead factor.
 * V8 stores strings as UCS-2 (2 bytes per char), so in-memory size is ~2x the
 * UTF-8 on-disk size for ASCII content. We use content.length * 2 to estimate
 * the actual heap footprint rather than relying on stat.size.
 */
const V8_STRING_BYTES_PER_CHAR = 2;

// =============================================================================
// ARCH-003: Unified Source Directories
// =============================================================================

/**
 * All source directories to scan for mining.
 * This unified list ensures consistent coverage across all mining functions.
 *
 * Previously each function scanned different directories:
 * - mineEntities: src, app, lib, pages, components, models, entities, types
 * - mineRoutes: src, app, pages, routes, views
 * - mineForms: src, app, components, forms, schemas, validation
 * - mineTables: src, app, components, tables, grids, views
 * - mineModals: src, app, components, modals, dialogs
 *
 * Now all functions scan this unified list.
 */
export const SOURCE_DIRECTORIES = [
  // Core directories (always present in most projects)
  'src',
  'app',

  // Component directories
  'components',
  'lib',

  // Page/View directories
  'pages',
  'views',

  // Model/Type directories
  'models',
  'entities',
  'types',

  // Route directories
  'routes',

  // Form directories
  'forms',
  'schemas',
  'validation',

  // Table directories
  'tables',
  'grids',

  // Modal directories
  'modals',
  'dialogs',

  // Additional common directories (expanded coverage)
  'features', // Feature-sliced design
  'modules', // NestJS, Angular
  'services', // Common for service layers
  'utils', // Utility functions
  'helpers', // Helper functions
  'api', // API routes
  'stores', // Pinia, Vuex, Redux stores
  'hooks', // React hooks
  'contexts', // React contexts
  'providers', // Context providers
  'layouts', // Layout components
  'shared', // Shared code
  'common', // Common utilities
] as const;

/** Type for source directories */
export type SourceDirectory = (typeof SOURCE_DIRECTORIES)[number];

// =============================================================================
// ARCH-002: File Content Cache (with mtime validation and LRU eviction)
// =============================================================================

/** Cache statistics for observability */
export interface CacheStats {
  hits: number;
  misses: number;
  skipped: number; // Files too large
  invalidations: number; // Files invalidated due to mtime change
  evictions: number; // Files evicted by LRU
  cacheSize: number;
  memoryUsage: number;
  totalBytesRead: number;
}

/** Doubly-linked list node for O(1) LRU eviction */
interface LRUNode {
  key: string;
  prev: LRUNode | null;
  next: LRUNode | null;
}

/** Cache entry with content and metadata */
interface CacheEntry {
  content: string;
  size: number;
  mtime: number;
  lastAccessed: number; // For stats only, LRU uses linked list
  node: LRUNode; // Reference to position in LRU list
}

/**
 * In-memory cache for file contents during mining.
 *
 * Features:
 * - mtime validation: Detects and invalidates stale content
 * - LRU eviction: Removes least-recently-used entries when full
 * - Memory limits: Caps total memory usage to prevent OOM
 * - Statistics: Tracks hits, misses, evictions for observability
 *
 * This cache is designed for single mining sessions and should be
 * cleared after use to free memory.
 *
 * @example
 * const cache = new MiningCache();
 * const content = await cache.getContent('/path/to/file.ts');
 * // ... use content multiple times
 * console.log(cache.getStats()); // View cache performance
 * cache.clear(); // Free memory when done
 */
export class MiningCache {
  private cache = new Map<string, CacheEntry>();
  private currentMemoryUsage = 0;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    skipped: 0,
    invalidations: 0,
    evictions: 0,
    cacheSize: 0,
    memoryUsage: 0,
    totalBytesRead: 0,
  };

  /** Optional: Skip mtime validation for performance (use with caution) */
  private validateMtime: boolean;

  // LRU doubly-linked list: head is most recently used, tail is least recently used
  private lruHead: LRUNode | null = null;
  private lruTail: LRUNode | null = null;

  /**
   * Create a new MiningCache.
   *
   * @param options - Cache configuration options
   */
  constructor(options: { validateMtime?: boolean } = {}) {
    this.validateMtime = options.validateMtime !== false; // Default: true
  }

  /**
   * Get file content, using cache if available.
   * Validates mtime to ensure content freshness.
   *
   * @param filePath - Absolute path to the file
   * @returns File content or null if unreadable/too large
   */
  async getContent(filePath: string): Promise<string | null> {
    const normalizedPath = path.resolve(filePath);

    // Check cache first
    const cached = this.cache.get(normalizedPath);
    if (cached) {
      // Validate freshness if enabled
      if (this.validateMtime) {
        try {
          const currentStat = await fsp.lstat(normalizedPath);
          // SEC-005: Defense-in-depth - reject symlinks that bypassed scan filtering
          if (currentStat.isSymbolicLink()) {
            this.removeEntry(normalizedPath);
            return null;
          }
          if (currentStat.mtimeMs !== cached.mtime) {
            // File changed - invalidate and re-read
            this.removeEntry(normalizedPath);
            this.stats.invalidations++;
            // Fall through to re-read below
          } else {
            // Cache hit - move to head of LRU list (O(1))
            cached.lastAccessed = Date.now();
            this.moveToHead(cached.node);
            this.stats.hits++;
            return cached.content;
          }
        } catch {
          // File deleted or unreadable - remove from cache
          this.removeEntry(normalizedPath);
          return null;
        }
      } else {
        // No validation - direct cache hit, move to head of LRU list (O(1))
        cached.lastAccessed = Date.now();
        this.moveToHead(cached.node);
        this.stats.hits++;
        return cached.content;
      }
    }

    // Read file and potentially cache
    let stat: fs.Stats;
    try {
      stat = await fsp.lstat(normalizedPath);
    } catch {
      return null;
    }

    // SEC-005: Defense-in-depth - reject symlinks
    if (stat.isSymbolicLink()) {
      return null;
    }

    // Skip files that are too large
    if (stat.size > MAX_CACHE_FILE_SIZE) {
      this.stats.skipped++;
      return null;
    }

    // Read the file
    let content: string;
    try {
      content = await fsp.readFile(normalizedPath, 'utf-8');
    } catch {
      return null;
    }

    // V8 stores strings as UCS-2 (~2 bytes per char), not UTF-8
    const memorySize = content.length * V8_STRING_BYTES_PER_CHAR;
    this.stats.totalBytesRead += stat.size;
    this.stats.misses++;

    // Cache if possible (with LRU eviction)
    if (this.canCache(memorySize)) {
      this.ensureCapacity(memorySize);
      // Create LRU node for O(1) eviction
      const node: LRUNode = { key: normalizedPath, prev: null, next: null };
      this.addEntry(normalizedPath, {
        content,
        size: memorySize,
        mtime: stat.mtimeMs,
        lastAccessed: Date.now(),
        node,
      });
    }

    return content;
  }

  /**
   * Check if a file has been cached.
   *
   * @param filePath - Absolute path to the file
   * @returns True if the file is in cache
   */
  has(filePath: string): boolean {
    return this.cache.has(path.resolve(filePath));
  }

  /**
   * Manually invalidate a cached file.
   *
   * @param filePath - Absolute path to the file
   * @returns True if the file was in cache and removed
   */
  invalidate(filePath: string): boolean {
    const normalizedPath = path.resolve(filePath);
    if (this.cache.has(normalizedPath)) {
      this.removeEntry(normalizedPath);
      this.stats.invalidations++;
      return true;
    }
    return false;
  }

  /**
   * Warm up the cache with pre-read files.
   * Useful for testing or when files are already in memory.
   *
   * @param files - Array of files with path, content, and optional mtime
   */
  async warmUp(
    files: Array<{ path: string; content: string; mtime?: number; size?: number }>
  ): Promise<void> {
    for (const file of files) {
      const normalizedPath = path.resolve(file.path);
      // Use V8-aware size: provided size, or content.length * 2 for heap estimate
      const size = file.size ?? file.content.length * V8_STRING_BYTES_PER_CHAR;

      // Skip if too large
      if (size > MAX_CACHE_FILE_SIZE) {continue;}

      // Skip if would exceed memory
      if (!this.canCache(size)) {break;}

      // Get mtime if not provided
      let mtime = file.mtime;
      if (mtime === undefined) {
        try {
          const stat = await fsp.lstat(normalizedPath);
          if (stat.isSymbolicLink()) {continue;} // SEC-005
          mtime = stat.mtimeMs;
        } catch {
          mtime = Date.now(); // Fallback
        }
      }

      // Create LRU node for O(1) eviction
      const node: LRUNode = { key: normalizedPath, prev: null, next: null };
      this.addEntry(normalizedPath, {
        content: file.content,
        size,
        mtime,
        lastAccessed: Date.now(),
        node,
      });
    }
  }

  /**
   * Get cache statistics.
   *
   * @returns Cache hit/miss statistics
   */
  getStats(): Readonly<CacheStats> {
    return { ...this.stats };
  }

  /**
   * Get the hit rate as a percentage.
   *
   * @returns Hit rate between 0 and 100
   */
  getHitRate(): number {
    const total = this.stats.hits + this.stats.misses;
    if (total === 0) {return 0;}
    return Math.round((this.stats.hits / total) * 100);
  }

  /**
   * Clear the cache and reset statistics.
   * Call this after mining to free memory.
   */
  clear(): void {
    this.cache.clear();
    this.currentMemoryUsage = 0;
    this.lruHead = null;
    this.lruTail = null;
    this.stats = {
      hits: 0,
      misses: 0,
      skipped: 0,
      invalidations: 0,
      evictions: 0,
      cacheSize: 0,
      memoryUsage: 0,
      totalBytesRead: 0,
    };
  }

  /**
   * Get the number of cached files.
   *
   * @returns Number of files in cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get current memory usage in bytes.
   *
   * @returns Memory usage in bytes
   */
  get memoryUsage(): number {
    return this.currentMemoryUsage;
  }

  // =========================================================================
  // Private methods
  // =========================================================================

  /**
   * Check if we can cache a file of the given size.
   */
  private canCache(size: number): boolean {
    return this.currentMemoryUsage + size <= MAX_CACHE_MEMORY;
  }

  /**
   * Ensure capacity for a new entry by evicting if necessary.
   */
  private ensureCapacity(requiredSize: number): void {
    // Evict by count limit
    if (this.cache.size >= MAX_CACHED_FILES) {
      const evictCount = Math.ceil(MAX_CACHED_FILES * EVICTION_BATCH_PERCENT);
      this.evictLRU(evictCount);
    }

    // Evict by memory limit
    while (!this.canCache(requiredSize) && this.cache.size > 0) {
      this.evictLRU(1);
    }
  }

  /**
   * Evict least-recently-used entries from the tail of the LRU list.
   * O(1) per eviction using doubly-linked list.
   */
  private evictLRU(count: number): void {
    for (let i = 0; i < count && this.lruTail; i++) {
      const keyToRemove = this.lruTail.key;
      this.removeEntry(keyToRemove);
      this.stats.evictions++;
    }
  }

  /**
   * Move a node to the head of the LRU list (most recently used).
   * O(1) operation.
   */
  private moveToHead(node: LRUNode): void {
    if (node === this.lruHead) {return;} // Already at head

    // Remove from current position
    this.unlinkNode(node);

    // Add to head
    node.prev = null;
    node.next = this.lruHead;
    if (this.lruHead) {
      this.lruHead.prev = node;
    }
    this.lruHead = node;
    if (!this.lruTail) {
      this.lruTail = node;
    }
  }

  /**
   * Remove a node from the LRU list without deleting it.
   * O(1) operation.
   */
  private unlinkNode(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.lruHead = node.next;
    }
    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.lruTail = node.prev;
    }
  }

  /**
   * Add an entry to the cache and the head of the LRU list.
   */
  private addEntry(key: string, entry: CacheEntry): void {
    this.cache.set(key, entry);
    this.currentMemoryUsage += entry.size;

    // Add to head of LRU list
    this.moveToHead(entry.node);

    this.stats.cacheSize = this.cache.size;
    this.stats.memoryUsage = this.currentMemoryUsage;
  }

  /**
   * Remove an entry from the cache and the LRU list.
   */
  private removeEntry(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      // Remove from LRU list
      this.unlinkNode(entry.node);

      this.currentMemoryUsage -= entry.size;
      this.cache.delete(key);
      this.stats.cacheSize = this.cache.size;
      this.stats.memoryUsage = this.currentMemoryUsage;
    }
  }
}

// =============================================================================
// Scanned File Collection
// =============================================================================

/** A scanned file with its path and content */
export interface ScannedFile {
  path: string;
  content: string;
}

/** Options for scanning */
export interface ScanOptions {
  maxDepth?: number;
  maxFiles?: number;
  extensions?: string[];
}

/** Default extensions to scan */
const DEFAULT_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.vue', '.svelte'];

/**
 * Scan a directory and collect source files.
 * Uses the provided cache to avoid redundant reads.
 *
 * @param dir - Directory to scan
 * @param cache - File cache instance
 * @param options - Scan options
 * @returns Array of scanned files with content
 */
export async function scanDirectory(
  dir: string,
  cache: MiningCache,
  options: ScanOptions = {}
): Promise<ScannedFile[]> {
  const maxDepth = options.maxDepth ?? 15;
  const maxFiles = options.maxFiles ?? 3000;
  const extensions = options.extensions ?? DEFAULT_EXTENSIONS;

  const files: ScannedFile[] = [];

  async function scanRecursive(currentDir: string, depth: number): Promise<void> {
    if (depth > maxDepth || files.length >= maxFiles) {return;}

    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (files.length >= maxFiles) {break;}

      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        // Skip hidden directories and common non-source directories
        // Also skip symlinks to prevent infinite loops and security issues
        if (
          !entry.name.startsWith('.') &&
          entry.name !== 'node_modules' &&
          entry.name !== 'dist' &&
          entry.name !== 'build' &&
          entry.name !== 'coverage' &&
          entry.name !== '__pycache__' &&
          entry.name !== '.git' &&
          entry.name !== '.svn' &&
          !entry.isSymbolicLink()
        ) {
          await scanRecursive(fullPath, depth + 1);
        }
      } else if (entry.isFile() && extensions.some((ext) => entry.name.endsWith(ext))) {
        // Also skip symlinks for files (security)
        if (entry.isSymbolicLink()) {continue;}

        const content = await cache.getContent(fullPath);
        if (content !== null) {
          files.push({ path: fullPath, content });
        }
      }
    }
  }

  await scanRecursive(dir, 0);
  return files;
}

/**
 * Scan all source directories in a project.
 * This is the main entry point for unified scanning.
 *
 * @param projectRoot - Project root directory
 * @param cache - File cache instance
 * @param options - Scan options
 * @returns Array of all scanned files with content
 */
export async function scanAllSourceDirectories(
  projectRoot: string,
  cache: MiningCache,
  options: ScanOptions = {}
): Promise<ScannedFile[]> {
  const resolvedRoot = path.resolve(projectRoot);
  const allFiles: ScannedFile[] = [];
  const seenPaths = new Set<string>();

  for (const dir of SOURCE_DIRECTORIES) {
    const fullPath = path.join(resolvedRoot, dir);

    // Validate path is within project root (security)
    const resolvedPath = path.resolve(fullPath);
    if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
      continue;
    }

    // Check if directory exists (SEC-005: use lstat to detect symlinks)
    try {
      const stat = await fsp.lstat(fullPath);
      if (stat.isSymbolicLink() || !stat.isDirectory()) {continue;}
    } catch {
      continue;
    }

    const files = await scanDirectory(fullPath, cache, options);

    // Deduplicate files (in case directories overlap)
    for (const file of files) {
      if (!seenPaths.has(file.path)) {
        seenPaths.add(file.path);
        allFiles.push(file);
      }
    }
  }

  return allFiles;
}

/**
 * Create a pre-populated cache from an array of files.
 * Useful for testing or when files are already in memory.
 *
 * @param files - Array of files to cache
 * @returns Pre-populated cache
 */
export async function createCacheFromFiles(files: ScannedFile[]): Promise<MiningCache> {
  const cache = new MiningCache({ validateMtime: false }); // Skip mtime for pre-populated

  await cache.warmUp(
    files.map((f) => ({
      path: f.path,
      content: f.content,
    }))
  );

  return cache;
}
