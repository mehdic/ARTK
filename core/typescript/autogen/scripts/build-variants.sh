#!/bin/bash
set -e

echo "Building AutoGen variants..."

# Clean previous builds
rm -rf dist dist-cjs dist-legacy-16 dist-legacy-14

# Build Modern ESM (default)
echo "Building modern-esm..."
npm run build:esm

# Build Modern CJS
echo "Building modern-cjs..."
npm run build:cjs

# Build Legacy Node 16
echo "Building legacy-16..."
npm run build:legacy-16

# Build Legacy Node 14
echo "Building legacy-14..."
npm run build:legacy-14

echo "All variants built successfully!"
