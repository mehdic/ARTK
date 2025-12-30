#!/bin/bash
#
# ARTK Core Vendor Installation Script
# Usage: ./install-to-project.sh /path/to/target-project
#
# This script copies @artk/core to the target project's vendor directory
# and updates package.json to reference it.
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script lives
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ARTK_CORE_DIR="$(dirname "$SCRIPT_DIR")"

# Check arguments
if [ -z "$1" ]; then
    echo -e "${RED}Error: Target project path required${NC}"
    echo ""
    echo "Usage: $0 /path/to/target-project"
    echo ""
    echo "Example:"
    echo "  $0 ~/projects/my-playwright-project"
    echo "  $0 ."
    exit 1
fi

TARGET_PROJECT="$(cd "$1" 2>/dev/null && pwd)" || {
    echo -e "${RED}Error: Target directory does not exist: $1${NC}"
    exit 1
}

echo -e "${GREEN}ARTK Core Vendor Installation${NC}"
echo "================================"
echo "Source: $ARTK_CORE_DIR"
echo "Target: $TARGET_PROJECT"
echo ""

# Check if dist exists, if not build it
if [ ! -d "$ARTK_CORE_DIR/dist" ]; then
    echo -e "${YELLOW}Building @artk/core (dist not found)...${NC}"
    cd "$ARTK_CORE_DIR"
    npm install
    npm run build
    echo ""
fi

# Check target has package.json
if [ ! -f "$TARGET_PROJECT/package.json" ]; then
    echo -e "${RED}Error: No package.json found in target project${NC}"
    echo "Run 'npm init -y' in your project first."
    exit 1
fi

# Create vendor directory
VENDOR_DIR="$TARGET_PROJECT/vendor/artk-core"
echo -e "${YELLOW}Creating vendor directory...${NC}"
mkdir -p "$VENDOR_DIR"

# Copy files
echo -e "${YELLOW}Copying @artk/core files...${NC}"
cp -r "$ARTK_CORE_DIR/dist" "$VENDOR_DIR/"
cp "$ARTK_CORE_DIR/package.json" "$VENDOR_DIR/"
cp "$ARTK_CORE_DIR/version.json" "$VENDOR_DIR/"
cp "$ARTK_CORE_DIR/README.md" "$VENDOR_DIR/" 2>/dev/null || true

# Update package.json
echo -e "${YELLOW}Updating package.json...${NC}"
cd "$TARGET_PROJECT"

# Check if @artk/core already exists in package.json
if grep -q '"@artk/core"' package.json; then
    echo -e "${YELLOW}Updating existing @artk/core dependency...${NC}"
    # Use node to update package.json properly
    node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.devDependencies = pkg.devDependencies || {};
pkg.devDependencies['@artk/core'] = 'file:./vendor/artk-core';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
else
    echo -e "${YELLOW}Adding @artk/core to devDependencies...${NC}"
    node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.devDependencies = pkg.devDependencies || {};
pkg.devDependencies['@artk/core'] = 'file:./vendor/artk-core';
// Sort devDependencies
const sorted = {};
Object.keys(pkg.devDependencies).sort().forEach(k => sorted[k] = pkg.devDependencies[k]);
pkg.devDependencies = sorted;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
"
fi

# Run npm install to link the package (always use --legacy-peer-deps for compatibility)
echo -e "${YELLOW}Linking package...${NC}"
npm install --legacy-peer-deps

echo ""
echo -e "${GREEN}✅ @artk/core installed successfully!${NC}"
echo ""
echo "Vendor location: $VENDOR_DIR"
echo ""
echo "You can now import from @artk/core:"
echo "  import { loadConfig } from '@artk/core/config';"
echo "  import { test, expect } from '@artk/core/fixtures';"
echo "  import { createPlaywrightConfig } from '@artk/core/harness';"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Create artk.config.yml in your project root"
echo "  2. Update playwright.config.ts to use createPlaywrightConfig()"
echo "  3. Write tests using @artk/core/fixtures"
echo ""
