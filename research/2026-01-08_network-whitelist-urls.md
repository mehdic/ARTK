# Network Whitelist URLs for ARTK/Playwright Development

**Date:** 2026-01-08
**Topic:** Minimum URLs to whitelist for Playwright browser downloads and Docker images

---

## Problem

Company network blocks:
- Playwright browser downloads
- Docker image pulls
- Possibly npm registry

## Solution: Request IT to Whitelist These URLs

---

## 1. Playwright Browser Downloads (CRITICAL)

### Primary CDN URLs (All Three Required)

| URL | Purpose | Port |
|-----|---------|------|
| `https://playwright.azureedge.net` | Primary CDN for browser downloads | 443 |
| `https://playwright-akamai.azureedge.net` | Akamai mirror | 443 |
| `https://playwright-verizon.azureedge.net` | Verizon mirror | 443 |

**Why all three?** Playwright uses multiple mirrors for redundancy. It automatically falls back between them.

### URL Pattern Example

Full download URLs follow this pattern:
```
https://playwright.azureedge.net/builds/chromium/1091/chromium-win64.zip
```

Format: `https://[cdn-domain]/builds/[browser]/[build-number]/[browser]-[platform].zip`

**Sources:**
- [Playwright Issue #12184: What is the url of the download request](https://github.com/microsoft/playwright/issues/12184)
- [Playwright Issue #31839: Blocking browser binaries urls](https://github.com/microsoft/playwright/issues/31839)
- [Playwright Docs: Browsers](https://playwright.dev/docs/browsers)

---

## 2. Docker Registry (Optional - for Docker Image Extraction)

### Microsoft Container Registry (MCR)

| URL | Purpose | Port |
|-----|---------|------|
| `mcr.microsoft.com` | Registry endpoint and discovery | 443 |
| `*.data.mcr.microsoft.com` | Data endpoint (CDN) | 443 |

**Note:** The wildcard `*.data.mcr.microsoft.com` is important because MCR uses regional CDNs that change over time.

### China Region (if applicable)

| URL | Purpose | Port |
|-----|---------|------|
| `mcr.azure.cn` | Registry endpoint (China) | 443 |
| `*.data.mcr.azure.cn` | Data endpoint (China CDN) | 443 |

**Sources:**
- [MCR Endpoints Guidance](https://github.com/microsoft/containerregistry/blob/main/docs/mcr-endpoints-guidance.md)
- [Container Registry Firewall Rules](https://github.com/microsoft/containerregistry/blob/main/docs/client-firewall-rules.md)

---

## 3. NPM Registry (Usually Already Allowed)

| URL | Purpose | Port |
|-----|---------|------|
| `https://registry.npmjs.org` | NPM package downloads | 443 |

Most companies already allow this, but verify if npm install works.

---

## Priority List for IT Request

### Minimum Required (Playwright Only)

If you can only whitelist a few URLs, request these:

**Priority 1 (Playwright browsers):**
```
https://playwright.azureedge.net
https://playwright-akamai.azureedge.net
https://playwright-verizon.azureedge.net
```

**Priority 2 (npm packages):**
```
https://registry.npmjs.org
```

### Optional (Docker Extraction Method)

**Priority 3 (Docker images):**
```
mcr.microsoft.com
*.data.mcr.microsoft.com
```

---

## IT Request Template

Use this template when requesting whitelist from IT:

---

**Subject:** Firewall Whitelist Request - Playwright Browser Testing Tool

**To:** IT Security Team

**Request:** Please whitelist the following URLs to allow Playwright browser downloads for automated testing.

**Business Justification:**
Playwright is a Microsoft-developed browser automation tool required for our E2E testing infrastructure. Browser binaries must be downloaded from Microsoft CDN during installation.

**Required URLs (HTTPS/443):**
- `https://playwright.azureedge.net`
- `https://playwright-akamai.azureedge.net`
- `https://playwright-verizon.azureedge.net`

**Optional (for Docker-based workflow):**
- `mcr.microsoft.com`
- `*.data.mcr.microsoft.com`

**Vendor:** Microsoft Corporation
**Tool:** Playwright (https://playwright.dev)
**Documentation:** https://playwright.dev/docs/browsers

**Alternative:** If whitelisting is not possible, we can manually transfer browser binaries via USB drive.

---

## Verification Commands

After IT whitelists URLs, verify access:

### Test Playwright CDN Access

```bash
# Test primary CDN
curl -I https://playwright.azureedge.net/builds/chromium/1091/chromium-win64.zip

# Should return HTTP 200 or 302 (redirect)
```

### Test Docker Registry Access

```bash
# Test MCR access
curl -I https://mcr.microsoft.com/v2/

# Should return HTTP 200
```

### Test NPM Registry Access

```bash
# Test npm registry
npm ping

# Should return: Ping success
```

---

## Troubleshooting

### Issue: Downloads still failing after whitelist

**Check proxy settings:**

```bash
# Windows (PowerShell)
$env:HTTP_PROXY
$env:HTTPS_PROXY

# Linux/Mac
echo $HTTP_PROXY
echo $HTTPS_PROXY
```

**Solution:** Configure Playwright proxy:

```bash
export HTTPS_PROXY=http://proxy.company.com:8080
npm install @playwright/test
```

### Issue: SSL/TLS certificate errors

**Symptom:** `certificate verify failed`

**Cause:** Corporate SSL inspection/MITM proxy

**Solution:** Configure npm to trust corporate certificate:

```bash
# Add corporate CA certificate
npm config set cafile /path/to/corporate-ca.crt

# Or disable SSL verification (NOT recommended for production)
npm config set strict-ssl false
```

---

## Alternative: Offline Installation Without Whitelist

If IT cannot whitelist URLs, use USB transfer method:

### Option A: Manual Browser Transfer

1. **On personal computer:**
   ```bash
   npm install @playwright/test
   npx playwright install chromium
   tar -czf playwright-browsers.tar.gz ~/.cache/ms-playwright/
   ```

2. **Transfer via USB to company PC**

3. **On company PC:**
   ```bash
   tar -xzf playwright-browsers.tar.gz -C ~/
   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install @playwright/test
   ```

### Option B: Docker Extraction (if Docker allowed)

See `research/2026-01-08_extract-browsers-from-docker.md` (if created)

---

## Security Considerations for IT

**Why these URLs are safe:**

1. **Microsoft-owned domains:**
   - `playwright.azureedge.net` - Microsoft Azure CDN
   - `mcr.microsoft.com` - Microsoft Container Registry

2. **HTTPS only:** All downloads use encrypted connections (port 443)

3. **Read-only:** These are download-only endpoints (no uploads)

4. **Verified binaries:** All browser binaries are signed by Microsoft

5. **Industry standard:** Playwright is used by Microsoft, Google, Facebook, and thousands of enterprises

**Official documentation:**
- https://playwright.dev/docs/browsers
- https://github.com/microsoft/playwright

---

## Summary Table

| Resource | URLs | Priority | Why Needed |
|----------|------|----------|------------|
| Playwright browsers | playwright.azureedge.net<br>playwright-akamai.azureedge.net<br>playwright-verizon.azureedge.net | **CRITICAL** | Download Chromium/Firefox/WebKit binaries |
| NPM packages | registry.npmjs.org | High | Download npm packages (usually already allowed) |
| Docker images | mcr.microsoft.com<br>*.data.mcr.microsoft.com | Optional | Alternative: Extract browsers from Docker |

---

## References

### Playwright Documentation
- [Browsers - Playwright Docs](https://playwright.dev/docs/browsers)
- [GitHub Issue #12184: Download URLs](https://github.com/microsoft/playwright/issues/12184)
- [GitHub Issue #31839: Blocking browser binaries](https://github.com/microsoft/playwright/issues/31839)

### Microsoft Container Registry
- [MCR Endpoints Guidance](https://github.com/microsoft/containerregistry/blob/main/docs/mcr-endpoints-guidance.md)
- [Client Firewall Rules](https://github.com/microsoft/containerregistry/blob/main/docs/client-firewall-rules.md)
- [Azure Container Registry Firewall Access](https://learn.microsoft.com/en-us/azure/container-registry/container-registry-firewall-access-rules)
