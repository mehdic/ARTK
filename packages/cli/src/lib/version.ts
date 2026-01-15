/**
 * Version utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the CLI version from package.json
 */
export function getVersion(): string {
  try {
    // Try to find package.json relative to the built file
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'package.json'),
      path.join(__dirname, '..', 'package.json'),
      path.join(__dirname, 'package.json'),
    ];

    for (const pkgPath of possiblePaths) {
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkg.version || '0.0.0';
      }
    }

    return '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Get the @artk/core version from bundled assets
 */
export function getCoreVersion(): string {
  try {
    const possiblePaths = [
      path.join(__dirname, '..', '..', 'assets', 'core', 'package.json'),
      path.join(__dirname, '..', 'assets', 'core', 'package.json'),
    ];

    for (const pkgPath of possiblePaths) {
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return pkg.version || '0.0.0';
      }
    }

    return '0.0.0';
  } catch {
    return '0.0.0';
  }
}
