#!/bin/bash
#
# Extract Playwright browsers from Docker image
# Usage: ./extract-browsers-from-docker.sh [version]
#
# This script:
# 1. Pulls the official Playwright Docker image
# 2. Extracts browser binaries from the image
# 3. Creates a tarball for transfer to restricted networks
#

set -e

VERSION=${1:-v1.57.0}
IMAGE="mcr.microsoft.com/playwright:${VERSION}-focal"
OUTPUT="playwright-browsers-${VERSION}.tar.gz"

echo "╔════════════════════════════════════════════╗"
echo "║  Extract Playwright Browsers from Docker  ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Install Docker from: https://www.docker.com/get-started"
    exit 1
fi

# Pull Docker image
echo "📥 Pulling Docker image: $IMAGE"
echo "   (This may take a few minutes, ~2GB download)"
docker pull "$IMAGE"

echo ""
echo "📦 Creating temporary container..."
docker create --name playwright-extract "$IMAGE"

echo ""
echo "📂 Extracting browsers from container..."
mkdir -p playwright-browsers
docker cp playwright-extract:/ms-playwright ./playwright-browsers/

echo ""
echo "🧹 Cleaning up container..."
docker rm playwright-extract

echo ""
echo "🗜️  Creating tarball: $OUTPUT"
tar -czf "$OUTPUT" playwright-browsers/

echo ""
echo "🧹 Cleaning up temp directory..."
rm -rf playwright-browsers/

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║              Extraction Complete!          ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo "✓ Created: $OUTPUT"
echo "✓ Size: $(du -sh $OUTPUT | cut -f1)"
echo ""
echo "Next steps:"
echo "  1. Transfer $OUTPUT to your company PC"
echo "  2. Extract: tar -xzf $OUTPUT"
echo "  3. Copy browsers to cache:"
echo ""
echo "     Windows (PowerShell):"
echo "     \$PlaywrightCache = \"\$env:LOCALAPPDATA\\ms-playwright\""
echo "     New-Item -ItemType Directory -Force -Path \$PlaywrightCache"
echo "     Copy-Item -Path \"playwright-browsers\\ms-playwright\\*\" -Destination \$PlaywrightCache -Recurse -Force"
echo ""
echo "     Mac/Linux:"
echo "     mkdir -p ~/.cache/ms-playwright"
echo "     cp -r playwright-browsers/ms-playwright/* ~/.cache/ms-playwright/"
echo ""
echo "  4. Install npm packages with:"
echo "     PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install @playwright/test@${VERSION#v}"
echo ""
