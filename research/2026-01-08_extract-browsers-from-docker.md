# Extract Playwright Browsers from Docker Image

**Date:** 2026-01-08
**Topic:** How to extract Playwright browser binaries from Docker image for use on company network

---

## Problem

Company network blocks browser downloads but allows:
- Docker image pulls
- npm package downloads

## Solution

Extract browsers from official Playwright Docker image and use them locally.

---

## Method 1: Extract from Docker Image (No Container Run)

### Step 1: Pull Docker Image

```bash
docker pull mcr.microsoft.com/playwright:v1.57.0-focal
```

**Size:** ~2GB (includes all browsers: Chromium, Firefox, WebKit)

### Step 2: Create Container (Don't Run)

```bash
docker create --name playwright-extract mcr.microsoft.com/playwright:v1.57.0-focal
```

### Step 3: Copy Browsers Out

```bash
# Create output directory
mkdir -p playwright-browsers

# Extract browsers from container
docker cp playwright-extract:/ms-playwright ./playwright-browsers/
```

### Step 4: Clean Up Container

```bash
docker rm playwright-extract
```

### Step 5: Check What You Got

```bash
ls -lh playwright-browsers/ms-playwright/
```

**Expected output:**
```
chromium-1200/
firefox-1490/
webkit-2113/
ffmpeg-1011/
```

### Step 6: Package for Transfer

```bash
# Create tarball
tar -czf playwright-browsers-v1.57.0.tar.gz playwright-browsers/

# Check size
du -sh playwright-browsers-v1.57.0.tar.gz
```

**Tarball size:** ~500-600MB compressed

---

## Method 2: Run Container and Extract

### Alternative Approach

```bash
# Run container in background
docker run -d --name playwright-temp mcr.microsoft.com/playwright:v1.57.0-focal sleep 3600

# Copy browsers
docker cp playwright-temp:/ms-playwright ./playwright-browsers/

# Stop and remove
docker stop playwright-temp
docker rm playwright-temp
```

---

## Installation on Company PC

### Step 1: Transfer Tarball

Transfer `playwright-browsers-v1.57.0.tar.gz` to company PC via:
- USB drive
- Internal file share
- Email (if size allowed)
- Cloud storage (if allowed)

### Step 2: Extract on Company PC

**Windows:**
```powershell
# Extract (use 7-Zip or tar on Windows)
tar -xzf playwright-browsers-v1.57.0.tar.gz

# Copy to Playwright cache location
$PlaywrightCache = "$env:LOCALAPPDATA\ms-playwright"
New-Item -ItemType Directory -Force -Path $PlaywrightCache
Copy-Item -Path "playwright-browsers\ms-playwright\*" -Destination $PlaywrightCache -Recurse -Force
```

**Linux/Mac:**
```bash
# Extract
tar -xzf playwright-browsers-v1.57.0.tar.gz

# Copy to Playwright cache
mkdir -p ~/.cache/ms-playwright
cp -r playwright-browsers/ms-playwright/* ~/.cache/ms-playwright/
```

### Step 3: Install @playwright/test WITHOUT Browser Download

```bash
# Skip browser download during npm install
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install @playwright/test@1.57.0
```

**Or in package.json:**
```json
{
  "scripts": {
    "preinstall": "echo 'Skipping browser download - using pre-installed browsers'",
    "install": "echo 'Browsers already installed'"
  },
  "dependencies": {
    "@playwright/test": "1.57.0"
  }
}
```

### Step 4: Verify Installation

```bash
# Check if browsers are found
npx playwright --version

# Try to launch browser
node -e "const { chromium } = require('playwright'); (async () => { const browser = await chromium.launch(); console.log('Success!'); await browser.close(); })()"
```

---

## Alternative: Extract Only Chromium (Smaller Size)

If you only need Chromium (not Firefox/WebKit):

```bash
# After extracting from Docker
cd playwright-browsers/ms-playwright/

# Keep only Chromium
rm -rf firefox-* webkit-*

# Package just Chromium
cd ..
tar -czf playwright-chromium-only-v1.57.0.tar.gz ms-playwright/
```

**Chromium-only tarball size:** ~150-200MB compressed

---

## Docker Image Breakdown

### What's Inside mcr.microsoft.com/playwright:v1.57.0-focal

```
/ms-playwright/
├── chromium-1200/              # ~300MB
│   └── chrome-linux/
│       └── chrome              # Chromium binary
├── firefox-1490/               # ~100MB
│   └── firefox/
│       └── firefox             # Firefox binary
├── webkit-2113/                # ~100MB
│   └── pw_run.sh
└── ffmpeg-1011/                # ~10MB
    └── ffmpeg-linux
```

**Total uncompressed:** ~500MB

---

## Environment Variables Reference

### PLAYWRIGHT_BROWSERS_PATH

Set custom browser location:

```bash
# Install browsers to custom path
export PLAYWRIGHT_BROWSERS_PATH=/path/to/browsers
npm install playwright
```

**Then in your code:**
```javascript
// Playwright will look in PLAYWRIGHT_BROWSERS_PATH
const { chromium } = require('playwright');
```

### PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD

Skip downloading during npm install:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install @playwright/test
```

### PLAYWRIGHT_DOWNLOAD_HOST

Use internal mirror (if your company sets one up):

```bash
export PLAYWRIGHT_DOWNLOAD_HOST=https://internal-mirror.company.com
npm install @playwright/test
```

---

## Complete Workflow for Company Network

### On Personal Computer (with internet):

```bash
# 1. Pull Docker image
docker pull mcr.microsoft.com/playwright:v1.57.0-focal

# 2. Extract browsers
docker create --name pw-extract mcr.microsoft.com/playwright:v1.57.0-focal
docker cp pw-extract:/ms-playwright ./playwright-browsers/
docker rm pw-extract

# 3. Package for transfer
tar -czf playwright-browsers-v1.57.0.tar.gz playwright-browsers/

# 4. Transfer to USB/cloud storage
```

### On Company Computer (no internet):

```powershell
# 1. Extract browsers
tar -xzf playwright-browsers-v1.57.0.tar.gz

# 2. Copy to Playwright cache
$PlaywrightCache = "$env:LOCALAPPDATA\ms-playwright"
New-Item -ItemType Directory -Force -Path $PlaywrightCache
Copy-Item -Path "playwright-browsers\ms-playwright\*" -Destination $PlaywrightCache -Recurse -Force

# 3. Install npm packages (browsers already in place)
$env:PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
npm install

# 4. Verify
npx playwright --version
```

---

## Troubleshooting

### Issue: Browsers not found after extraction

**Check cache location:**

**Windows:**
```powershell
dir $env:LOCALAPPDATA\ms-playwright
```

**Linux/Mac:**
```bash
ls -la ~/.cache/ms-playwright/
```

**Expected structure:**
```
ms-playwright/
├── chromium-1200/
│   └── chrome-linux/    # or chrome-win/ on Windows
├── ffmpeg-1011/
```

### Issue: Version mismatch

**Error:** `Browser version mismatch`

**Solution:** Ensure Docker image version matches @playwright/test version:

```bash
# Both should be 1.57.0
docker pull mcr.microsoft.com/playwright:v1.57.0-focal
npm install @playwright/test@1.57.0
```

### Issue: Permission errors

**Windows:** Run as Administrator when copying to `%LOCALAPPDATA%`

**Linux/Mac:**
```bash
chmod -R 755 ~/.cache/ms-playwright/
```

---

## Benefits of This Approach

1. ✅ **Works on restricted networks** - No internet required after initial download
2. ✅ **One-time setup** - Extract once, use on multiple machines
3. ✅ **Official binaries** - From Microsoft's official Docker image
4. ✅ **Version-locked** - Guaranteed compatibility
5. ✅ **Smaller than full image** - ~600MB compressed vs 2GB image
6. ✅ **Portable** - Transfer via USB, shared drive, etc.

---

## Automation Script

### extract-browsers.sh

```bash
#!/bin/bash
#
# Extract Playwright browsers from Docker image
# Usage: ./extract-browsers.sh [version]
#

VERSION=${1:-v1.57.0}
IMAGE="mcr.microsoft.com/playwright:${VERSION}-focal"
OUTPUT="playwright-browsers-${VERSION}.tar.gz"

echo "Pulling Docker image: $IMAGE"
docker pull "$IMAGE"

echo "Creating temporary container..."
docker create --name playwright-extract "$IMAGE"

echo "Extracting browsers..."
mkdir -p playwright-browsers
docker cp playwright-extract:/ms-playwright ./playwright-browsers/

echo "Cleaning up container..."
docker rm playwright-extract

echo "Creating tarball: $OUTPUT"
tar -czf "$OUTPUT" playwright-browsers/

echo "Cleaning up temp directory..."
rm -rf playwright-browsers/

echo ""
echo "✓ Done!"
echo "Transfer $OUTPUT to your company PC"
echo "Size: $(du -sh $OUTPUT | cut -f1)"
```

**Usage:**
```bash
chmod +x extract-browsers.sh
./extract-browsers.sh v1.57.0
```

---

## Conclusion

**Best approach for company network:**

1. Pull Docker image on personal computer
2. Extract browsers from image
3. Package as tarball (~600MB)
4. Transfer to company PC
5. Extract to Playwright cache directory
6. Install @playwright/test with PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

**This completely bypasses network restrictions while using official, verified browser binaries.**
