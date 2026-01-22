#!/usr/bin/env node
import { createRequire } from 'module';
import { program } from 'commander';
import { execSync, spawn } from 'child_process';
import fs6 from 'fs-extra';
import * as path5 from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import * as fs2 from 'fs';
import * as https from 'https';
import * as crypto from 'crypto';
import { z } from 'zod';
import yaml from 'yaml';
import * as semver from 'semver';
import * as readline from 'readline';

createRequire(import.meta.url);
var Logger = class {
  spinner = null;
  verbose;
  constructor(options = {}) {
    this.verbose = options.verbose ?? false;
  }
  header(text) {
    console.log("");
    console.log(chalk.green("\u2554" + "\u2550".repeat(text.length + 6) + "\u2557"));
    console.log(chalk.green("\u2551   ") + chalk.bold.green(text) + chalk.green("   \u2551"));
    console.log(chalk.green("\u255A" + "\u2550".repeat(text.length + 6) + "\u255D"));
    console.log("");
  }
  step(current, total, message) {
    this.stopSpinner();
    console.log(chalk.yellow(`[${current}/${total}]`) + " " + message);
  }
  startSpinner(message) {
    this.stopSpinner();
    this.spinner = ora(message).start();
  }
  updateSpinner(message) {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }
  succeedSpinner(message) {
    if (this.spinner) {
      this.spinner.succeed(message);
      this.spinner = null;
    }
  }
  failSpinner(message) {
    if (this.spinner) {
      this.spinner.fail(message);
      this.spinner = null;
    }
  }
  stopSpinner() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
  info(message) {
    console.log(chalk.cyan("\u2139") + " " + message);
  }
  success(message) {
    console.log(chalk.green("\u2713") + " " + message);
  }
  warning(message) {
    console.log(chalk.yellow("\u26A0") + " " + chalk.yellow(message));
  }
  error(message) {
    console.log(chalk.red("\u2717") + " " + chalk.red(message));
  }
  debug(message) {
    if (this.verbose) {
      console.log(chalk.gray("  " + message));
    }
  }
  list(items, indent = 2) {
    const prefix = " ".repeat(indent);
    for (const item of items) {
      console.log(prefix + chalk.dim("\u2022") + " " + item);
    }
  }
  table(rows) {
    const maxLabelLength = Math.max(...rows.map((r) => r.label.length));
    for (const row of rows) {
      const paddedLabel = row.label.padEnd(maxLabelLength);
      console.log("  " + chalk.dim(paddedLabel) + "  " + row.value);
    }
  }
  nextSteps(steps) {
    console.log("");
    console.log(chalk.cyan("Next steps:"));
    steps.forEach((step, i) => {
      console.log(chalk.dim(`  ${i + 1}.`) + " " + step);
    });
    console.log("");
  }
  blank() {
    console.log("");
  }
  divider() {
    console.log(chalk.dim("\u2500".repeat(50)));
  }
};
new Logger();
async function detectEnvironment(projectPath) {
  const resolvedPath = path5.resolve(projectPath);
  return {
    moduleSystem: detectModuleSystem(resolvedPath),
    nodeVersion: process.version,
    npmVersion: await detectNpmVersion(),
    hasGit: await detectGit(resolvedPath),
    hasPlaywright: detectPlaywright(resolvedPath),
    hasArtkCore: detectArtkCore(resolvedPath),
    platform: process.platform,
    arch: process.arch,
    isCI: detectCI()
  };
}
function detectModuleSystem(projectPath) {
  const packageJsonPath = path5.join(projectPath, "package.json");
  if (fs2.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs2.readFileSync(packageJsonPath, "utf8"));
      if (pkg.type === "module") {
        return "esm";
      }
      if (pkg.type === "commonjs" || !pkg.type) {
        const hasEsmConfig = fs2.existsSync(path5.join(projectPath, "tsconfig.json"));
        if (hasEsmConfig) {
          try {
            const tsconfig = JSON.parse(fs2.readFileSync(path5.join(projectPath, "tsconfig.json"), "utf8"));
            const module = tsconfig.compilerOptions?.module?.toLowerCase();
            if (module && (module.includes("esnext") || module.includes("es20") || module === "nodenext")) {
              return "esm";
            }
          } catch {
          }
        }
        return "commonjs";
      }
    } catch {
    }
  }
  const srcDir = path5.join(projectPath, "src");
  if (fs2.existsSync(srcDir)) {
    try {
      const files = fs2.readdirSync(srcDir, { recursive: true });
      const hasMjs = files.some((f) => f.endsWith(".mjs"));
      const hasCjs = files.some((f) => f.endsWith(".cjs"));
      if (hasMjs && !hasCjs) return "esm";
      if (hasCjs && !hasMjs) return "commonjs";
    } catch {
    }
  }
  return "unknown";
}
async function detectNpmVersion() {
  try {
    const { execSync: execSync5 } = await import('child_process');
    const version2 = execSync5("npm --version", { encoding: "utf8" }).trim();
    return version2;
  } catch {
    return null;
  }
}
async function detectGit(projectPath) {
  if (fs2.existsSync(path5.join(projectPath, ".git"))) {
    return true;
  }
  try {
    const { execSync: execSync5 } = await import('child_process');
    execSync5("git rev-parse --git-dir", { cwd: projectPath, encoding: "utf8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
function detectPlaywright(projectPath) {
  const playwrightPath = path5.join(projectPath, "node_modules", "@playwright", "test");
  return fs2.existsSync(playwrightPath);
}
function detectArtkCore(projectPath) {
  const vendorPath = path5.join(projectPath, "artk-e2e", "vendor", "artk-core");
  if (fs2.existsSync(vendorPath)) return true;
  const nodeModulesPath = path5.join(projectPath, "node_modules", "@artk", "core");
  return fs2.existsSync(nodeModulesPath);
}
function isCI() {
  return !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI || process.env.JENKINS_HOME || process.env.CIRCLECI || process.env.TRAVIS || process.env.TF_BUILD || process.env.USER === "jenkins" || process.env.USER === "gitlab-runner" || process.env.USER === "circleci");
}
function detectCI() {
  return isCI();
}
function getOsArch() {
  let os;
  switch (process.platform) {
    case "darwin":
      os = "macos";
      break;
    case "win32":
      os = "windows";
      break;
    case "linux":
      os = "linux";
      break;
    default:
      os = "unknown";
  }
  let arch;
  switch (process.arch) {
    case "x64":
      arch = "x64";
      break;
    case "arm64":
      arch = "arm64";
      break;
    case "ia32":
      arch = "x86";
      break;
    default:
      arch = "unknown";
  }
  return { os, arch };
}
async function resolveBrowser(targetPath, logger2, options = {}) {
  const log = logger2 || new Logger();
  const artkE2ePath = path5.join(targetPath, "artk-e2e");
  const browsersCachePath = path5.join(targetPath, ".artk", "browsers");
  const logsDir = options.logsDir || path5.join(targetPath, ".artk", "logs");
  fs2.mkdirSync(browsersCachePath, { recursive: true });
  fs2.mkdirSync(logsDir, { recursive: true });
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersCachePath;
  let strategy = options.strategy || "auto";
  if (options.skipBundled) {
    log.debug("skipBundled option set - using system browsers only");
    strategy = "system-only";
  }
  if (isCI() && strategy !== "system-only") {
    log.info("CI environment detected - using bundled browsers for reproducibility");
    strategy = "bundled-only";
  }
  switch (strategy) {
    case "bundled-only":
      return await resolveBundledOnly(artkE2ePath, browsersCachePath, logsDir, log);
    case "system-only":
      return await resolveSystemOnly(logsDir, log);
    case "prefer-system":
      return await resolvePreferSystem(artkE2ePath, browsersCachePath, logsDir, log);
    case "prefer-bundled":
    case "auto":
    default:
      return await resolveAuto(artkE2ePath, browsersCachePath, logsDir, log);
  }
}
async function resolveBundledOnly(artkE2ePath, browsersCachePath, logsDir, logger2) {
  logger2.debug("Strategy: bundled-only - trying release cache...");
  const releaseCacheResult = await tryReleaseCacheBrowsers(artkE2ePath, browsersCachePath, logsDir, logger2);
  if (releaseCacheResult) {
    return releaseCacheResult;
  }
  logger2.debug("Release cache unavailable, trying bundled install...");
  const bundledResult = await tryBundledInstall(artkE2ePath, browsersCachePath, logsDir, logger2);
  if (bundledResult) {
    return bundledResult;
  }
  throw new Error(
    `Strategy is "bundled-only" but bundled browser installation failed.
Solutions:
  1. Check network connectivity
  2. Grant permissions for Playwright browser installation
  3. Set ARTK_PLAYWRIGHT_BROWSERS_REPO for release cache
  4. Check logs at: ${logsDir}`
  );
}
async function resolveSystemOnly(logsDir, logger2) {
  logger2.debug("Strategy: system-only - detecting system browsers...");
  const systemResult = await detectSystemBrowser(logsDir, logger2);
  if (systemResult.channel !== "bundled") {
    return systemResult;
  }
  throw new Error(
    `Strategy is "system-only" but no system browsers found.
Solutions:
  1. Install Microsoft Edge: https://microsoft.com/edge
  2. Install Google Chrome: https://google.com/chrome
  3. Change strategy in artk.config.yml to "auto" or "prefer-bundled"
  4. Check logs at: ${logsDir}`
  );
}
async function resolvePreferSystem(artkE2ePath, browsersCachePath, logsDir, logger2) {
  logger2.debug("Strategy: prefer-system - checking system browsers first...");
  const systemResult = await detectSystemBrowser(logsDir, logger2);
  if (systemResult.channel !== "bundled") {
    logger2.success(`Using system browser: ${systemResult.channel}`);
    return systemResult;
  }
  logger2.debug("No system browsers found, falling back to bundled...");
  const releaseCacheResult = await tryReleaseCacheBrowsers(artkE2ePath, browsersCachePath, logsDir, logger2);
  if (releaseCacheResult) {
    return releaseCacheResult;
  }
  const bundledResult = await tryBundledInstall(artkE2ePath, browsersCachePath, logsDir, logger2);
  if (bundledResult) {
    return bundledResult;
  }
  return failWithDiagnostics(logsDir, logger2);
}
async function resolveAuto(artkE2ePath, browsersCachePath, logsDir, logger2) {
  logger2.debug("Attempting to download pre-built browsers from release cache...");
  const releaseCacheResult = await tryReleaseCacheBrowsers(artkE2ePath, browsersCachePath, logsDir, logger2);
  if (releaseCacheResult) {
    return releaseCacheResult;
  }
  logger2.debug("Attempting bundled Playwright browser install...");
  const bundledResult = await tryBundledInstall(artkE2ePath, browsersCachePath, logsDir, logger2);
  if (bundledResult) {
    return bundledResult;
  }
  logger2.debug("Detecting system browsers...");
  const systemResult = await detectSystemBrowser(logsDir, logger2);
  if (systemResult.channel !== "bundled") {
    return systemResult;
  }
  return failWithDiagnostics(logsDir, logger2);
}
function failWithDiagnostics(logsDir, logger2) {
  logger2.error("ERROR: No browsers available");
  logger2.error("ARTK tried:");
  logger2.error("  1. Pre-built browser cache: Unavailable");
  logger2.error("  2. Bundled Chromium install: Failed");
  logger2.error("  3. System Microsoft Edge: Not found");
  logger2.error("  4. System Google Chrome: Not found");
  logger2.error("");
  logger2.error("Solutions:");
  logger2.error("  1. Install Microsoft Edge: https://microsoft.com/edge");
  logger2.error("  2. Install Google Chrome: https://google.com/chrome");
  logger2.error("  3. Set ARTK_PLAYWRIGHT_BROWSERS_REPO for release cache");
  logger2.error("  4. Grant permissions for Playwright browser installation");
  logger2.error(`  5. Check logs at: ${logsDir}`);
  throw new Error("No browsers available. See error messages above for solutions.");
}
async function tryReleaseCacheBrowsers(artkE2ePath, browsersCachePath, logsDir, logger2) {
  const logFile = path5.join(logsDir, "release-cache-download.log");
  const logLines = [`Release cache download attempt - ${(/* @__PURE__ */ new Date()).toISOString()}`];
  const browsersJsonPath = path5.join(artkE2ePath, "node_modules", "playwright-core", "browsers.json");
  if (!fs2.existsSync(browsersJsonPath)) {
    logLines.push("browsers.json not found, skipping release cache");
    writeLogFile(logFile, logLines);
    logger2.debug("browsers.json not found, skipping release cache");
    return null;
  }
  try {
    const browsersJson = JSON.parse(fs2.readFileSync(browsersJsonPath, "utf8"));
    const chromium = browsersJson.browsers?.find((b) => b.name === "chromium");
    if (!chromium?.revision) {
      logLines.push("Chromium revision not found in browsers.json");
      writeLogFile(logFile, logLines);
      logger2.debug("Chromium revision not found in browsers.json");
      return null;
    }
    logLines.push(`Chromium revision: ${chromium.revision}`);
    const { os, arch } = getOsArch();
    if (os === "unknown" || arch === "unknown") {
      logLines.push(`Unsupported OS/arch: ${os}/${arch}`);
      writeLogFile(logFile, logLines);
      logger2.debug(`Unsupported OS/arch: ${os}/${arch}`);
      return null;
    }
    logLines.push(`OS/arch: ${os}/${arch}`);
    const cachedPath = path5.join(browsersCachePath, `chromium-${chromium.revision}`);
    if (fs2.existsSync(cachedPath)) {
      logLines.push(`Browsers already cached: ${cachedPath}`);
      writeLogFile(logFile, logLines);
      logger2.debug(`Browsers already cached: ${cachedPath}`);
      return {
        channel: "bundled",
        version: chromium.revision,
        path: cachedPath,
        strategy: "release-cache"
      };
    }
    const playwrightPkgPath = path5.join(artkE2ePath, "node_modules", "@playwright", "test", "package.json");
    let playwrightVersion = "1.57.0";
    if (fs2.existsSync(playwrightPkgPath)) {
      const pkg = JSON.parse(fs2.readFileSync(playwrightPkgPath, "utf8"));
      playwrightVersion = pkg.version;
    }
    logLines.push(`Playwright version: ${playwrightVersion}`);
    const repo = process.env.ARTK_PLAYWRIGHT_BROWSERS_REPO;
    if (!repo) {
      logLines.push("ARTK_PLAYWRIGHT_BROWSERS_REPO not set, skipping release cache");
      writeLogFile(logFile, logLines);
      logger2.debug("ARTK_PLAYWRIGHT_BROWSERS_REPO not set, skipping release cache");
      return null;
    }
    const tag = process.env.ARTK_PLAYWRIGHT_BROWSERS_TAG || `playwright-browsers-${playwrightVersion}`;
    const asset = `chromium-${chromium.revision}-${os}-${arch}.zip`;
    const baseUrl = `https://github.com/${repo}/releases/download/${tag}`;
    const zipUrl = `${baseUrl}/${asset}`;
    const shaUrl = `${baseUrl}/${asset}.sha256`;
    logLines.push(`Repo: ${repo}`);
    logLines.push(`Tag: ${tag}`);
    logLines.push(`Asset: ${asset}`);
    logLines.push(`URL: ${zipUrl}`);
    logger2.startSpinner("Downloading pre-built browsers from release cache...");
    const zipPath = path5.join(browsersCachePath, asset);
    const shaPath = `${zipPath}.sha256`;
    try {
      logLines.push("Downloading ZIP...");
      await downloadFile(zipUrl, zipPath, 3e4);
      logLines.push(`ZIP downloaded: ${fs2.statSync(zipPath).size} bytes`);
      logLines.push("Downloading SHA256...");
      await downloadFile(shaUrl, shaPath, 1e4);
      const expectedHash = fs2.readFileSync(shaPath, "utf8").split(/\s+/)[0].trim().toLowerCase();
      const actualHash = await computeSha256(zipPath);
      logLines.push(`Expected SHA256: ${expectedHash}`);
      logLines.push(`Actual SHA256: ${actualHash}`);
      if (expectedHash !== actualHash) {
        logLines.push("ERROR: SHA256 checksum mismatch!");
        writeLogFile(logFile, logLines);
        logger2.failSpinner("Browser cache checksum mismatch");
        fs2.unlinkSync(zipPath);
        fs2.unlinkSync(shaPath);
        return null;
      }
      logLines.push("Checksum verified");
      logLines.push("Extracting ZIP...");
      await extractZip(zipPath, browsersCachePath);
      logLines.push(`Extracted to: ${browsersCachePath}`);
      fs2.unlinkSync(zipPath);
      fs2.unlinkSync(shaPath);
      logLines.push("SUCCESS: Browser cache downloaded and verified");
      writeLogFile(logFile, logLines);
      logger2.succeedSpinner("Pre-built browsers downloaded from release cache");
      return {
        channel: "bundled",
        version: chromium.revision,
        path: path5.join(browsersCachePath, `chromium-${chromium.revision}`),
        strategy: "release-cache"
      };
    } catch (downloadError) {
      logLines.push(`Download failed: ${downloadError}`);
      writeLogFile(logFile, logLines);
      logger2.failSpinner("Release cache download failed");
      if (fs2.existsSync(zipPath)) fs2.unlinkSync(zipPath);
      if (fs2.existsSync(shaPath)) fs2.unlinkSync(shaPath);
      return null;
    }
  } catch (error) {
    logLines.push(`Release cache check failed: ${error}`);
    writeLogFile(logFile, logLines);
    logger2.debug(`Release cache check failed: ${error}`);
    return null;
  }
}
function downloadFile(url, destPath, timeoutMs) {
  return new Promise((resolve7, reject) => {
    const file = fs2.createWriteStream(destPath);
    const request = https.get(url, { timeout: timeoutMs }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs2.unlinkSync(destPath);
          downloadFile(redirectUrl, destPath, timeoutMs).then(resolve7).catch(reject);
          return;
        }
      }
      if (response.statusCode !== 200) {
        file.close();
        fs2.unlinkSync(destPath);
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve7();
      });
    });
    request.on("error", (err) => {
      file.close();
      if (fs2.existsSync(destPath)) fs2.unlinkSync(destPath);
      reject(err);
    });
    request.on("timeout", () => {
      request.destroy();
      file.close();
      if (fs2.existsSync(destPath)) fs2.unlinkSync(destPath);
      reject(new Error(`Download timeout: ${url}`));
    });
  });
}
function computeSha256(filePath) {
  return new Promise((resolve7, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs2.createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve7(hash.digest("hex").toLowerCase()));
    stream.on("error", reject);
  });
}
async function extractZip(zipPath, destDir) {
  return new Promise((resolve7, reject) => {
    const commands = [
      { cmd: "unzip", args: ["-q", zipPath, "-d", destDir] },
      { cmd: "bsdtar", args: ["-xf", zipPath, "-C", destDir] },
      { cmd: "tar", args: ["-xzf", zipPath, "-C", destDir] }
    ];
    const tryCommand = (index) => {
      if (index >= commands.length) {
        reject(new Error("No suitable unzip command found (tried: unzip, bsdtar, tar)"));
        return;
      }
      const { cmd, args } = commands[index];
      const child = spawn(cmd, args, { stdio: "pipe" });
      child.on("error", () => {
        tryCommand(index + 1);
      });
      child.on("close", (code) => {
        if (code === 0) {
          resolve7();
        } else {
          tryCommand(index + 1);
        }
      });
    };
    tryCommand(0);
  });
}
function writeLogFile(logPath, lines) {
  try {
    fs2.writeFileSync(logPath, lines.join("\n") + "\n");
  } catch {
  }
}
async function tryBundledInstall(artkE2ePath, browsersCachePath, logsDir, logger2) {
  const logFile = path5.join(logsDir, "playwright-browser-install.log");
  return new Promise((resolve7) => {
    logger2.startSpinner("Installing Playwright browsers...");
    const logLines = [`Playwright browser install attempt - ${(/* @__PURE__ */ new Date()).toISOString()}`];
    logLines.push(`Working directory: ${artkE2ePath}`);
    logLines.push(`Browsers cache: ${browsersCachePath}`);
    const child = spawn("npx", ["playwright", "install", "chromium"], {
      cwd: artkE2ePath,
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: browsersCachePath
      },
      shell: true,
      stdio: "pipe"
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      logLines.push(`Exit code: ${code}`);
      logLines.push("--- STDOUT ---");
      logLines.push(stdout || "(empty)");
      logLines.push("--- STDERR ---");
      logLines.push(stderr || "(empty)");
      writeLogFile(logFile, logLines);
      if (code === 0) {
        logger2.succeedSpinner("Playwright browsers installed");
        resolve7({
          channel: "bundled",
          version: null,
          path: browsersCachePath,
          strategy: "bundled-install"
        });
      } else {
        logger2.failSpinner("Failed to install Playwright browsers");
        logger2.debug(`Exit code: ${code}`);
        logger2.debug(`Details saved to: ${logFile}`);
        resolve7(null);
      }
    });
    child.on("error", (error) => {
      logLines.push(`Process error: ${error.message}`);
      writeLogFile(logFile, logLines);
      logger2.failSpinner("Failed to install Playwright browsers");
      logger2.debug(`Error: ${error.message}`);
      resolve7(null);
    });
    setTimeout(() => {
      logLines.push("TIMEOUT: Installation took longer than 5 minutes");
      writeLogFile(logFile, logLines);
      child.kill();
      logger2.failSpinner("Browser installation timed out");
      resolve7(null);
    }, 3e5);
  });
}
async function detectSystemBrowser(logsDir, logger2) {
  const logFile = path5.join(logsDir, "system-browser-detect.log");
  const logLines = [`System browser detection - ${(/* @__PURE__ */ new Date()).toISOString()}`];
  logLines.push(`Platform: ${process.platform}`);
  logLines.push("Checking Microsoft Edge...");
  const edgeInfo = await tryDetectBrowser("msedge", logLines);
  if (edgeInfo) {
    logLines.push(`SUCCESS: Found Edge at ${edgeInfo.path} (${edgeInfo.version})`);
    writeLogFile(logFile, logLines);
    logger2.success(`Detected Microsoft Edge: ${edgeInfo.version || "unknown version"}`);
    return edgeInfo;
  }
  logLines.push("Checking Google Chrome...");
  const chromeInfo = await tryDetectBrowser("chrome", logLines);
  if (chromeInfo) {
    logLines.push(`SUCCESS: Found Chrome at ${chromeInfo.path} (${chromeInfo.version})`);
    writeLogFile(logFile, logLines);
    logger2.success(`Detected Google Chrome: ${chromeInfo.version || "unknown version"}`);
    return chromeInfo;
  }
  logLines.push("No system browsers found");
  writeLogFile(logFile, logLines);
  return {
    channel: "bundled",
    version: null,
    path: null,
    strategy: "auto"
  };
}
async function tryDetectBrowser(browser, logLines, logger2) {
  const paths = getBrowserPaths(browser);
  for (const browserPath of paths) {
    logLines.push(`  Checking path: ${browserPath}`);
    if (fs2.existsSync(browserPath)) {
      const version2 = await getBrowserVersion(browserPath);
      logLines.push(`    Found! Version: ${version2 || "unknown"}`);
      return {
        channel: browser,
        version: version2,
        path: browserPath,
        strategy: "system"
      };
    } else {
      logLines.push("    Not found");
    }
  }
  const commands = browser === "msedge" ? ["microsoft-edge", "microsoft-edge-stable"] : ["google-chrome", "google-chrome-stable"];
  for (const cmd of commands) {
    logLines.push(`  Checking command: ${cmd}`);
    try {
      const output = execSync(`${cmd} --version`, { encoding: "utf8", stdio: "pipe", timeout: 5e3 });
      const versionMatch = output.match(/(\d+\.\d+\.\d+\.\d+)/);
      logLines.push(`    Found! Version: ${versionMatch ? versionMatch[1] : "unknown"}`);
      return {
        channel: browser,
        version: versionMatch ? versionMatch[1] : null,
        path: cmd,
        strategy: "system"
      };
    } catch (err) {
      logLines.push(`    Not found: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }
  return null;
}
async function getBrowserVersion(browserPath) {
  try {
    const output = execSync(`"${browserPath}" --version`, { encoding: "utf8", stdio: "pipe", timeout: 5e3 });
    const versionMatch = output.match(/(\d+\.\d+\.\d+\.\d+)/);
    return versionMatch ? versionMatch[1] : null;
  } catch {
    return null;
  }
}
function getBrowserPaths(browser) {
  const paths = [];
  if (process.platform === "win32") {
    const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env["LOCALAPPDATA"] || "";
    if (browser === "msedge") {
      paths.push(
        `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`,
        `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
        `${localAppData}\\Microsoft\\Edge\\Application\\msedge.exe`
      );
    } else {
      paths.push(
        `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
        `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
        `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`
      );
    }
  } else if (process.platform === "darwin") {
    if (browser === "msedge") {
      paths.push("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge");
    } else {
      paths.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    }
  } else {
    if (browser === "msedge") {
      paths.push("/usr/bin/microsoft-edge", "/usr/bin/microsoft-edge-stable", "/snap/bin/microsoft-edge");
    } else {
      paths.push(
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/snap/bin/chromium",
        "/usr/bin/chromium-browser"
      );
    }
  }
  return paths;
}
function updateArtkConfigBrowser(configPath, browserInfo) {
  if (!fs2.existsSync(configPath)) {
    return;
  }
  let content = fs2.readFileSync(configPath, "utf8");
  if (!/^\s*browsers\s*:/m.test(content)) {
    content += `
browsers:
  enabled:
    - chromium
  channel: ${browserInfo.channel}
  strategy: ${browserInfo.strategy}
  viewport:
    width: 1280
    height: 720
  headless: true
`;
  } else {
    content = content.replace(
      /^(\s*channel\s*:\s*).*$/m,
      `$1${browserInfo.channel}`
    );
    content = content.replace(
      /^(\s*strategy\s*:\s*).*$/m,
      `$1${browserInfo.strategy}`
    );
  }
  fs2.writeFileSync(configPath, content);
}
var environmentSchema = z.object({
  baseUrl: z.string().url().or(z.string().regex(/^\$\{[^}]+\}$/))
  // Allow env var placeholders
}).passthrough();
var authSchema = z.object({
  provider: z.enum(["oidc", "saml", "basic", "custom", "none"]).default("oidc"),
  storageStateDir: z.string().default("./.auth-states"),
  roles: z.record(z.object({
    username: z.string().optional(),
    password: z.string().optional()
  })).optional()
}).passthrough();
var browserSchema = z.object({
  enabled: z.array(z.enum(["chromium", "firefox", "webkit"])).default(["chromium"]),
  channel: z.enum(["bundled", "msedge", "chrome", "chrome-beta", "chrome-dev"]).default("bundled"),
  strategy: z.enum(["auto", "bundled-only", "system-only", "prefer-system", "prefer-bundled"]).default("auto"),
  viewport: z.object({
    width: z.number().min(320).max(3840).default(1280),
    height: z.number().min(240).max(2160).default(720)
  }).optional(),
  headless: z.boolean().default(true)
}).passthrough();
var settingsSchema = z.object({
  parallel: z.boolean().default(true),
  retries: z.number().min(0).max(10).default(2),
  timeout: z.number().min(1e3).max(3e5).default(3e4),
  traceOnFailure: z.boolean().default(true)
}).passthrough();
var artkConfigSchema = z.object({
  version: z.string().default("1.0"),
  app: z.object({
    name: z.string(),
    type: z.enum(["web", "mobile", "api"]).default("web"),
    description: z.string().optional()
  }),
  environments: z.record(environmentSchema),
  auth: authSchema.optional(),
  settings: settingsSchema.optional(),
  browsers: browserSchema.optional()
}).passthrough();
function validateArtkConfig(configPath, logger2) {
  const log = logger2 || new Logger();
  const result = {
    valid: true,
    errors: [],
    warnings: []
  };
  if (!fs2.existsSync(configPath)) {
    result.valid = false;
    result.errors.push(`Config file not found: ${configPath}`);
    return result;
  }
  try {
    const content = fs2.readFileSync(configPath, "utf8");
    const rawConfig = yaml.parse(content);
    if (!rawConfig || typeof rawConfig !== "object") {
      result.valid = false;
      result.errors.push("Config file is empty or invalid YAML");
      return result;
    }
    const parseResult = artkConfigSchema.safeParse(rawConfig);
    if (!parseResult.success) {
      result.valid = false;
      for (const error of parseResult.error.errors) {
        const path10 = error.path.join(".");
        result.errors.push(`${path10}: ${error.message}`);
      }
      return result;
    }
    result.config = parseResult.data;
    const additionalWarnings = checkAdditionalValidation(parseResult.data);
    result.warnings.push(...additionalWarnings);
    log.debug(`Config validation passed for ${configPath}`);
    return result;
  } catch (error) {
    result.valid = false;
    const errorMessage = error instanceof Error ? error.message : String(error);
    result.errors.push(`Failed to parse config: ${errorMessage}`);
    return result;
  }
}
function checkAdditionalValidation(config) {
  const warnings = [];
  if (Object.keys(config.environments).length === 0) {
    warnings.push("No environments defined - at least one is recommended");
  }
  const commonEnvs = ["local", "dev", "intg", "staging", "prod"];
  const hasCommonEnv = commonEnvs.some((env) => env in config.environments);
  if (!hasCommonEnv) {
    warnings.push(`Consider using standard environment names: ${commonEnvs.join(", ")}`);
  }
  if (config.browsers?.strategy === "system-only") {
    warnings.push("system-only browser strategy may fail in CI environments");
  }
  if (config.auth?.provider === "none" && config.auth?.roles) {
    warnings.push('Auth roles defined but provider is "none"');
  }
  if (config.settings?.timeout && config.settings.timeout < 5e3) {
    warnings.push("Very short timeout (< 5s) may cause flaky tests");
  }
  return warnings;
}

// src/lib/variants/variant-definitions.ts
var VARIANT_DEFINITIONS = {
  "modern-esm": {
    id: "modern-esm",
    displayName: "Modern ESM",
    nodeRange: ["18", "20", "22"],
    // LTS only
    playwrightVersion: "1.57.x",
    moduleSystem: "esm",
    tsTarget: "ES2022",
    distDirectory: "dist"
  },
  "modern-cjs": {
    id: "modern-cjs",
    displayName: "Modern CJS",
    nodeRange: ["18", "20", "22"],
    // LTS only
    playwrightVersion: "1.57.x",
    moduleSystem: "cjs",
    tsTarget: "ES2022",
    distDirectory: "dist-cjs"
  },
  "legacy-16": {
    id: "legacy-16",
    displayName: "Legacy Node 16",
    nodeRange: ["16", "18", "20"],
    // LTS only
    playwrightVersion: "1.49.x",
    moduleSystem: "cjs",
    tsTarget: "ES2021",
    distDirectory: "dist-legacy-16"
  },
  "legacy-14": {
    id: "legacy-14",
    displayName: "Legacy Node 14",
    nodeRange: ["14", "16", "18"],
    // LTS only
    playwrightVersion: "1.33.x",
    moduleSystem: "cjs",
    tsTarget: "ES2020",
    distDirectory: "dist-legacy-14"
  }
};
var ALL_VARIANT_IDS = [
  "modern-esm",
  "modern-cjs",
  "legacy-16",
  "legacy-14"
];
function getVariantDefinition(id) {
  return VARIANT_DEFINITIONS[id];
}
function getAllVariants() {
  return Object.values(VARIANT_DEFINITIONS);
}
function getRecommendedVariant(nodeMajor, moduleSystem) {
  if (nodeMajor >= 18) {
    return moduleSystem === "esm" ? "modern-esm" : "modern-cjs";
  }
  if (nodeMajor >= 16) {
    return "legacy-16";
  }
  if (nodeMajor >= 14) {
    return "legacy-14";
  }
  throw new Error(
    `Node.js ${nodeMajor} is not supported. ARTK requires Node.js 14 or higher.`
  );
}
function isVariantCompatible(variantId, nodeMajor) {
  const variant = VARIANT_DEFINITIONS[variantId];
  return variant.nodeRange.includes(String(nodeMajor));
}
function getVariantHelpText() {
  const lines = ["Available variants:"];
  for (const variant of getAllVariants()) {
    const nodeRange = variant.nodeRange.join(", ");
    lines.push(
      `  ${variant.id.padEnd(12)} - ${variant.displayName} (Node ${nodeRange}, Playwright ${variant.playwrightVersion})`
    );
  }
  return lines.join("\n");
}
function getNodeMajorVersion() {
  const version2 = process.version;
  const match = version2.match(/^v(\d+)/);
  if (!match) {
    throw new Error(`Unable to parse Node.js version: ${version2}`);
  }
  return parseInt(match[1], 10);
}
function findNearestPackageJson(startPath) {
  let currentPath = path5.resolve(startPath);
  const root = path5.parse(currentPath).root;
  while (currentPath !== root) {
    const packageJsonPath = path5.join(currentPath, "package.json");
    if (fs2.existsSync(packageJsonPath)) {
      return packageJsonPath;
    }
    currentPath = path5.dirname(currentPath);
  }
  return null;
}
function detectModuleSystem2(targetPath) {
  const targetPackageJson = path5.join(targetPath, "package.json");
  if (fs2.existsSync(targetPackageJson)) {
    try {
      const content = fs2.readFileSync(targetPackageJson, "utf-8");
      const pkg = JSON.parse(content);
      if (pkg.type === "module") {
        return "esm";
      }
      return "cjs";
    } catch {
    }
  }
  const nearestPackageJson = findNearestPackageJson(targetPath);
  if (nearestPackageJson) {
    try {
      const content = fs2.readFileSync(nearestPackageJson, "utf-8");
      const pkg = JSON.parse(content);
      if (pkg.type === "module") {
        return "esm";
      }
      return "cjs";
    } catch {
      return "cjs";
    }
  }
  return "cjs";
}
var __filename$1 = fileURLToPath(import.meta.url);
var __dirname$1 = path5.dirname(__filename$1);
function getArtkVersion() {
  const possiblePaths = [
    path5.join(__dirname$1, "..", "..", "package.json"),
    path5.join(__dirname$1, "..", "..", "..", "package.json"),
    path5.join(process.cwd(), "cli", "package.json")
  ];
  for (const pkgPath of possiblePaths) {
    try {
      if (fs2.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs2.readFileSync(pkgPath, "utf-8"));
        if (pkg.name?.includes("artk") && pkg.version) {
          return pkg.version;
        }
      }
    } catch {
    }
  }
  return "1.0.0";
}
function generateVariantFeatures(variant) {
  const variantDef = VARIANT_DEFINITIONS[variant];
  const features = {};
  const commonFeatures = [
    "route_from_har",
    "locator_filter",
    "web_first_assertions",
    "trace_viewer",
    "api_testing",
    "storage_state",
    "video_recording",
    "screenshot_assertions",
    "request_interception",
    "browser_contexts",
    "test_fixtures",
    "parallel_execution",
    "retry_logic"
  ];
  for (const feature of commonFeatures) {
    features[feature] = { available: true };
  }
  if (variant === "modern-esm" || variant === "modern-cjs") {
    features["aria_snapshots"] = { available: true };
    features["clock_api"] = { available: true };
    features["locator_or"] = { available: true };
    features["locator_and"] = { available: true };
    features["component_testing"] = { available: true };
    features["expect_poll"] = { available: true };
    features["expect_soft"] = { available: true };
    features["request_continue"] = { available: true };
  } else if (variant === "legacy-16") {
    features["aria_snapshots"] = { available: true };
    features["clock_api"] = { available: true };
    features["locator_or"] = { available: true };
    features["locator_and"] = { available: true };
    features["component_testing"] = { available: true };
    features["expect_poll"] = { available: true };
    features["expect_soft"] = { available: true };
    features["request_continue"] = { available: true };
  } else if (variant === "legacy-14") {
    features["aria_snapshots"] = {
      available: false,
      alternative: "Use page.evaluate() to query ARIA attributes manually",
      notes: "Introduced in Playwright 1.35"
    };
    features["clock_api"] = {
      available: false,
      alternative: "Use page.evaluate(() => { Date.now = () => fixedTime }) for manual mocking",
      notes: "Introduced in Playwright 1.45"
    };
    features["locator_or"] = {
      available: false,
      alternative: 'Use CSS :is() selector: page.locator(":is(.a, .b)")',
      notes: "Introduced in Playwright 1.34"
    };
    features["locator_and"] = {
      available: false,
      alternative: "Use chained filter: locator.filter({ has: other })",
      notes: "Introduced in Playwright 1.34"
    };
    features["component_testing"] = {
      available: false,
      alternative: "Use E2E testing approach with full page loads",
      notes: "Experimental in 1.33, stable in later versions"
    };
    features["expect_poll"] = {
      available: false,
      alternative: "Use expect.poll() polyfill with setTimeout loop",
      notes: "Introduced in Playwright 1.30 but improved later"
    };
    features["expect_soft"] = {
      available: false,
      alternative: "Collect assertions manually and report at end",
      notes: "Introduced in Playwright 1.37"
    };
    features["request_continue"] = { available: true };
  }
  if (variant === "modern-esm") {
    features["esm_imports"] = { available: true };
    features["top_level_await"] = { available: true };
    features["import_meta"] = { available: true };
  } else {
    features["esm_imports"] = {
      available: false,
      alternative: "Use require() for synchronous imports or dynamic import() for async"
    };
    features["top_level_await"] = {
      available: false,
      alternative: "Wrap in async IIFE: (async () => { await ... })()"
    };
    features["import_meta"] = {
      available: false,
      alternative: "Use __dirname and __filename (CommonJS globals)"
    };
  }
  return {
    variant,
    playwrightVersion: variantDef.playwrightVersion,
    nodeRange: variantDef.nodeRange,
    moduleSystem: variantDef.moduleSystem,
    tsTarget: variantDef.tsTarget,
    features,
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    generatedBy: `ARTK CLI v${getArtkVersion()}`
  };
}
function generateReadonlyMarker(variantDef, context) {
  return `# \u26A0\uFE0F DO NOT MODIFY THIS DIRECTORY

**This directory contains vendor code that should NOT be edited.**

## What This Is

This is a vendored copy of ARTK core code installed by the ARTK CLI.
It should be treated as read-only and immutable.

## Variant Information

| Property | Value |
|----------|-------|
| **Variant** | ${variantDef.id} |
| **Display Name** | ${variantDef.displayName} |
| **Node.js Range** | ${variantDef.nodeRange.join(", ")} |
| **Playwright Version** | ${variantDef.playwrightVersion} |
| **Module System** | ${variantDef.moduleSystem} |
| **TypeScript Target** | ${variantDef.tsTarget} |
| **Installed At** | ${context.variantInstalledAt} |
| **ARTK Version** | ${context.artkVersion} |
${context.previousVariant ? `| **Previous Variant** | ${context.previousVariant} |` : ""}

## If You Encounter Issues

### Import/Module Errors

If you see errors like \`ERR_REQUIRE_ESM\` or \`Cannot use import statement\`:

\`\`\`bash
# Check the installed variant
cat .artk/context.json | grep variant

# Reinstall with correct variant detection
artk init . --force

# Or force a specific variant
artk init . --variant modern-esm --force
\`\`\`

### Feature Not Working

Check \`variant-features.json\` in this directory to see if the feature is available
in your variant. If not, the file includes alternative approaches.

### Need Different Variant

\`\`\`bash
# Re-detect and install correct variant
artk upgrade .

# Or force a specific variant
artk init . --variant <variant-id> --force
\`\`\`

## For AI Agents (GitHub Copilot, Claude, etc.)

**DO NOT modify files in this directory.**

If you encounter compatibility issues:
1. Check the variant information above
2. Check \`variant-features.json\` for feature availability and alternatives
3. Suggest running \`artk init --force\` to reinstall with correct variant
4. Use alternative approaches documented in \`variant-features.json\`
5. NEVER patch or modify vendor code directly

---

*This file was generated by ARTK CLI v${context.artkVersion}*
`;
}
function generateAiIgnore(variant) {
  return `# ARTK Vendor Directory - DO NOT MODIFY
#
# This directory contains vendored @artk/core code.
# AI agents and code generation tools should NOT modify these files.
#
# Variant: ${variant}
# Generated: ${(/* @__PURE__ */ new Date()).toISOString()}
#
# If you need to change behavior:
# 1. Create wrapper functions in your project code
# 2. Use configuration in artk.config.yml
# 3. Run \`artk upgrade\` to get latest version
# 4. Run \`artk init --force\` to reinstall
#
# DO NOT:
# - Edit any .js or .ts files in this directory
# - Add polyfills or patches
# - Modify package.json
# - Create "fixes" for compatibility issues
#
# Instead, use \`artk init --variant <correct-variant> --force\`
#
*
`;
}

// src/lib/bootstrap.ts
var __filename2 = fileURLToPath(import.meta.url);
var __dirname2 = path5.dirname(__filename2);
var BOOTSTRAP_TEMPLATES_PATH = path5.resolve(__dirname2, "..", "assets", "bootstrap-templates");
function readBundledTemplate(templateName) {
  const templatePath = path5.join(BOOTSTRAP_TEMPLATES_PATH, templateName);
  if (fs6.existsSync(templatePath)) {
    const content = fs6.readFileSync(templatePath, "utf8");
    const lines = content.split("\n");
    return lines.slice(10).join("\n");
  }
  return null;
}
async function bootstrap(targetPath, options = {}) {
  const logger2 = new Logger({ verbose: options.verbose });
  const errors = [];
  const resolvedPath = path5.resolve(targetPath);
  const artkE2ePath = path5.join(resolvedPath, "artk-e2e");
  const artkDir = path5.join(resolvedPath, ".artk");
  const logsDir = path5.join(artkDir, "logs");
  logger2.header("ARTK Bootstrap Installation");
  logger2.table([
    { label: "Target", value: resolvedPath },
    { label: "ARTK E2E", value: artkE2ePath }
  ]);
  if (!fs6.existsSync(resolvedPath)) {
    logger2.error(`Target directory does not exist: ${resolvedPath}`);
    return { success: false, projectPath: resolvedPath, artkE2ePath, errors: ["Target directory does not exist"] };
  }
  if (fs6.existsSync(artkE2ePath) && !options.force) {
    logger2.error("ARTK is already installed in this project. Use --force to overwrite.");
    return { success: false, projectPath: resolvedPath, artkE2ePath, errors: ["Already installed"] };
  }
  const backup = {
    configPath: null,
    configBackupPath: null,
    contextPath: null,
    contextBackupPath: null
  };
  await fs6.ensureDir(logsDir);
  try {
    if (options.force) {
      const configPath2 = path5.join(artkE2ePath, "artk.config.yml");
      if (fs6.existsSync(configPath2)) {
        backup.configPath = configPath2;
        backup.configBackupPath = `${configPath2}.bootstrap-backup`;
        await fs6.copy(configPath2, backup.configBackupPath);
        logger2.debug("Backed up existing artk.config.yml");
      }
      const contextPath = path5.join(artkDir, "context.json");
      if (fs6.existsSync(contextPath)) {
        backup.contextPath = contextPath;
        backup.contextBackupPath = `${contextPath}.bootstrap-backup`;
        await fs6.copy(contextPath, backup.contextBackupPath);
        logger2.debug("Backed up existing context.json");
      }
    }
    logger2.step(1, 7, "Detecting environment and selecting variant...");
    const environment = await detectEnvironment(resolvedPath);
    const nodeMajor = getNodeMajorVersion();
    const detectedModuleSystem = detectModuleSystem2(resolvedPath);
    let selectedVariant;
    if (options.variant && options.variant !== "auto") {
      selectedVariant = options.variant;
      if (!isVariantCompatible(selectedVariant, nodeMajor)) {
        const variantDef2 = getVariantDefinition(selectedVariant);
        logger2.warning(`Variant '${selectedVariant}' is designed for Node ${variantDef2.nodeRange.join("/")}`);
        logger2.warning(`You are running Node ${nodeMajor}. This may cause compatibility issues.`);
      }
    } else {
      try {
        selectedVariant = getRecommendedVariant(nodeMajor, detectedModuleSystem);
        logger2.debug(`Auto-selected variant: ${selectedVariant} (Node ${nodeMajor}, ${detectedModuleSystem})`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger2.error(message);
        throw error;
      }
    }
    const variantDef = getVariantDefinition(selectedVariant);
    logger2.success(`Variant: ${selectedVariant} (${variantDef.displayName})`);
    logger2.debug(`Node.js: ${environment.nodeVersion} (major: ${nodeMajor})`);
    logger2.debug(`Module system: ${detectedModuleSystem}`);
    logger2.debug(`Playwright: ${variantDef.playwrightVersion}`);
    logger2.debug(`Platform: ${environment.platform}/${environment.arch}`);
    logger2.step(2, 7, "Creating artk-e2e/ structure...");
    await createDirectoryStructure(artkE2ePath);
    logger2.success("Directory structure created");
    logger2.step(3, 7, `Installing @artk/core (${selectedVariant}) to vendor/...`);
    await installVendorPackages(artkE2ePath, selectedVariant, logger2);
    logger2.success(`@artk/core installed to vendor/ (${variantDef.displayName})`);
    if (options.prompts !== false) {
      logger2.step(4, 7, "Installing prompts to .github/prompts/...");
      await installPrompts(resolvedPath, logger2);
      logger2.success("Prompts installed");
    } else {
      logger2.step(4, 7, "Skipping prompts installation (--no-prompts)");
    }
    logger2.step(5, 7, "Creating configuration files...");
    const projectName = path5.basename(resolvedPath);
    await createConfigurationFiles(artkE2ePath, artkDir, resolvedPath, {
      projectName,
      variant: selectedVariant,
      variantDef,
      nodeMajor,
      moduleSystem: detectedModuleSystem
    }, logger2);
    logger2.success("Configuration files created");
    const configPath = path5.join(artkE2ePath, "artk.config.yml");
    const configValidation = validateArtkConfig(configPath, logger2);
    if (!configValidation.valid) {
      logger2.error("Generated configuration validation failed:");
      for (const error of configValidation.errors) {
        logger2.error(`  - ${error}`);
      }
      throw new Error("Configuration validation failed");
    }
    if (configValidation.warnings.length > 0) {
      for (const warning of configValidation.warnings) {
        logger2.warning(`Config: ${warning}`);
      }
    }
    if (!options.skipNpm) {
      logger2.step(6, 7, "Running npm install...");
      await runNpmInstall(artkE2ePath, logsDir, logger2);
      logger2.success("npm install completed");
    } else {
      logger2.step(6, 7, "Skipping npm install (--skip-npm)");
    }
    let browserInfo;
    if (!options.skipBrowsers && !options.skipNpm) {
      logger2.step(7, 7, "Configuring browsers...");
      browserInfo = await resolveBrowser(resolvedPath, logger2, { logsDir });
      if (browserInfo.channel === "bundled") {
        logger2.debug("Installing Playwright browsers...");
        try {
          execSync("npx playwright install chromium", {
            cwd: artkE2ePath,
            stdio: "pipe",
            env: { ...process.env },
            timeout: 3e5
            // 5 minute timeout
          });
          logger2.debug("Playwright browsers installed");
        } catch (error) {
          logger2.warning("Playwright browser installation failed, using system browser fallback");
          if (browserInfo.channel === "bundled") {
            browserInfo = await resolveBrowser(resolvedPath, logger2, {
              logsDir,
              skipBundled: true
            });
          }
        }
      }
      const configPath2 = path5.join(artkE2ePath, "artk.config.yml");
      updateArtkConfigBrowser(configPath2, browserInfo);
      await updateContextJson(artkDir, { browser: browserInfo });
      logger2.success(`Browser configured: ${browserInfo.channel} (${browserInfo.strategy})`);
    } else {
      logger2.step(7, 7, "Skipping browser configuration");
    }
    await cleanupBackup(backup);
    printSuccessSummary(logger2, resolvedPath, artkE2ePath, browserInfo);
    return {
      success: true,
      projectPath: resolvedPath,
      artkE2ePath,
      browserInfo,
      environment,
      errors: []
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger2.error(`Bootstrap failed: ${errorMessage}`);
    errors.push(errorMessage);
    await rollbackOnFailure(backup, logger2);
    return {
      success: false,
      projectPath: resolvedPath,
      artkE2ePath,
      errors
    };
  }
}
async function rollbackOnFailure(backup, logger2) {
  logger2.warning("Attempting to roll back changes...");
  try {
    if (backup.configBackupPath && fs6.existsSync(backup.configBackupPath)) {
      if (backup.configPath) {
        await fs6.copy(backup.configBackupPath, backup.configPath);
        await fs6.remove(backup.configBackupPath);
        logger2.debug("Restored artk.config.yml from backup");
      }
    }
    if (backup.contextBackupPath && fs6.existsSync(backup.contextBackupPath)) {
      if (backup.contextPath) {
        await fs6.copy(backup.contextBackupPath, backup.contextPath);
        await fs6.remove(backup.contextBackupPath);
        logger2.debug("Restored context.json from backup");
      }
    }
    logger2.warning("Partial rollback completed. Some files may need manual cleanup.");
  } catch (rollbackError) {
    logger2.error(`Rollback failed: ${rollbackError}`);
    logger2.error("Manual cleanup may be required.");
  }
}
async function cleanupBackup(backup) {
  try {
    if (backup.configBackupPath && fs6.existsSync(backup.configBackupPath)) {
      await fs6.remove(backup.configBackupPath);
    }
    if (backup.contextBackupPath && fs6.existsSync(backup.contextBackupPath)) {
      await fs6.remove(backup.contextBackupPath);
    }
  } catch {
  }
}
async function createDirectoryStructure(artkE2ePath) {
  const directories = [
    "vendor/artk-core",
    "vendor/artk-core-autogen",
    "src/modules/foundation/auth",
    "src/modules/foundation/navigation",
    "src/modules/foundation/selectors",
    "src/modules/foundation/data",
    "src/modules/features",
    "config",
    "tests/setup",
    "tests/foundation",
    "tests/smoke",
    "tests/release",
    "tests/regression",
    "tests/journeys",
    "docs",
    "journeys",
    ".auth-states"
  ];
  for (const dir of directories) {
    await fs6.ensureDir(path5.join(artkE2ePath, dir));
  }
}
async function installVendorPackages(artkE2ePath, variant, logger2) {
  const assetsDir = getAssetsDir();
  const variantDef = getVariantDefinition(variant);
  const coreSource = path5.join(assetsDir, "core");
  const coreTarget = path5.join(artkE2ePath, "vendor", "artk-core");
  if (fs6.existsSync(coreSource)) {
    await fs6.copy(coreSource, coreTarget, {
      overwrite: true,
      filter: (src) => {
        const relativePath = path5.relative(coreSource, src);
        return !relativePath.startsWith("dist");
      }
    });
    const distSource = path5.join(coreSource, variantDef.distDirectory);
    const distTarget = path5.join(coreTarget, "dist");
    if (fs6.existsSync(distSource)) {
      await fs6.copy(distSource, distTarget, { overwrite: true });
      logger2.debug(`Copied @artk/core ${variantDef.distDirectory} \u2192 vendor/artk-core/dist`);
    } else {
      const defaultDist = path5.join(coreSource, "dist");
      if (fs6.existsSync(defaultDist)) {
        await fs6.copy(defaultDist, distTarget, { overwrite: true });
        logger2.warning(`Variant dist '${variantDef.distDirectory}' not found, using default dist`);
      } else {
        logger2.warning(`No dist folder found for @artk/core`);
      }
    }
    const context = {
      variantInstalledAt: (/* @__PURE__ */ new Date()).toISOString(),
      nodeVersion: getNodeMajorVersion(),
      moduleSystem: variantDef.moduleSystem,
      playwrightVersion: variantDef.playwrightVersion,
      artkVersion: getArtkVersion()};
    const features = generateVariantFeatures(variant);
    await fs6.writeJson(path5.join(coreTarget, "variant-features.json"), features, { spaces: 2 });
    const readonlyContent = generateReadonlyMarker(variantDef, context);
    await fs6.writeFile(path5.join(coreTarget, "READONLY.md"), readonlyContent);
    const aiIgnoreContent = generateAiIgnore(variant);
    await fs6.writeFile(path5.join(coreTarget, ".ai-ignore"), aiIgnoreContent);
    logger2.debug(`Copied @artk/core from bundled assets (variant: ${variant})`);
  } else {
    logger2.warning(`@artk/core assets not found at ${coreSource}`);
    await fs6.writeJson(path5.join(coreTarget, "package.json"), {
      name: "@artk/core",
      version: "1.0.0",
      main: "./dist/index.js"
    });
  }
  const autogenSource = path5.join(assetsDir, "autogen");
  const autogenTarget = path5.join(artkE2ePath, "vendor", "artk-core-autogen");
  if (fs6.existsSync(autogenSource)) {
    await fs6.copy(autogenSource, autogenTarget, { overwrite: true });
    logger2.debug(`Copied @artk/core-autogen from bundled assets`);
  } else {
    logger2.warning(`@artk/core-autogen assets not found at ${autogenSource}`);
    await fs6.writeJson(path5.join(autogenTarget, "package.json"), {
      name: "@artk/core-autogen",
      version: "0.1.0",
      main: "./dist/index.js"
    });
  }
}
async function installPrompts(projectPath, logger2) {
  const assetsDir = getAssetsDir();
  const promptsSource = path5.join(assetsDir, "prompts");
  const promptsTarget = path5.join(projectPath, ".github", "prompts");
  await fs6.ensureDir(promptsTarget);
  if (fs6.existsSync(promptsSource)) {
    const promptFiles = await fs6.readdir(promptsSource);
    let installed = 0;
    for (const file of promptFiles) {
      if (file.endsWith(".md") && file.startsWith("artk.")) {
        const source = path5.join(promptsSource, file);
        const targetName = file.replace(/\.md$/, ".prompt.md");
        const target = path5.join(promptsTarget, targetName);
        await fs6.copy(source, target, { overwrite: true });
        installed++;
        logger2.debug(`Installed prompt: ${targetName}`);
      }
    }
    logger2.debug(`Installed ${installed} prompt files`);
  } else {
    logger2.warning(`Prompts assets not found at ${promptsSource}`);
  }
}
async function createConfigurationFiles(artkE2ePath, artkDir, projectPath, options, logger2) {
  const playwrightVersionMap = {
    "1.57.x": "^1.57.0",
    "1.49.x": "^1.49.0",
    "1.33.x": "^1.33.0"
  };
  const playwrightVersion = playwrightVersionMap[options.variantDef.playwrightVersion];
  if (!playwrightVersion) {
    throw new Error(`Unknown Playwright version for variant ${options.variant}: ${options.variantDef.playwrightVersion}. Add mapping to playwrightVersionMap.`);
  }
  const nodeTypesMap = {
    "legacy-14": "^14.0.0",
    "legacy-16": "^16.0.0",
    "modern-esm": "^20.0.0",
    "modern-cjs": "^20.0.0"
  };
  const nodeTypesVersion = nodeTypesMap[options.variant];
  await fs6.writeJson(
    path5.join(artkE2ePath, "package.json"),
    {
      name: "artk-e2e",
      version: "1.0.0",
      private: true,
      scripts: {
        test: "playwright test",
        "test:smoke": "playwright test --grep @smoke",
        "test:release": "playwright test --grep @release",
        "test:regression": "playwright test --grep @regression",
        "test:validation": "playwright test --project=validation",
        "test:ui": "playwright test --ui",
        report: "playwright show-report",
        typecheck: "tsc --noEmit"
      },
      dependencies: {
        yaml: "^2.3.4"
      },
      devDependencies: {
        "@artk/core": "file:./vendor/artk-core",
        "@artk/core-autogen": "file:./vendor/artk-core-autogen",
        "@playwright/test": playwrightVersion,
        "@types/node": nodeTypesVersion,
        typescript: "^5.3.0"
      }
    },
    { spaces: 2 }
  );
  logger2.debug(`Using Playwright ${playwrightVersion} for variant ${options.variant}`);
  await fs6.writeFile(
    path5.join(artkE2ePath, "playwright.config.ts"),
    getPlaywrightConfigTemplate()
  );
  await fs6.writeJson(
    path5.join(artkE2ePath, "tsconfig.json"),
    {
      compilerOptions: {
        target: "ES2022",
        module: "CommonJS",
        moduleResolution: "Node",
        lib: ["ES2022", "DOM"],
        strict: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        outDir: "./dist",
        rootDir: ".",
        declaration: true,
        resolveJsonModule: true,
        baseUrl: ".",
        paths: {
          "@artk/core": ["./vendor/artk-core/dist"],
          "@artk/core/*": ["./vendor/artk-core/dist/*"]
        }
      },
      include: ["tests/**/*", "src/**/*", "config/**/*", "*.ts"],
      exclude: ["node_modules", "dist", "vendor"]
    },
    { spaces: 2 }
  );
  await fs6.writeFile(
    path5.join(artkE2ePath, "artk.config.yml"),
    getArtkConfigTemplate(options.projectName)
  );
  await fs6.writeFile(
    path5.join(artkE2ePath, ".gitignore"),
    `node_modules/
dist/
test-results/
playwright-report/
.auth-states/
*.local
`
  );
  const coreGeneratorPath = path5.join(artkE2ePath, "vendor", "artk-core", "scripts", "generate-foundation.ts");
  if (fs6.existsSync(coreGeneratorPath)) {
    logger2.debug("Generating foundation modules via @artk/core...");
    try {
      execSync(
        `npx tsx "${coreGeneratorPath}" --projectRoot="${projectPath}" --variant="${options.variant}"`,
        {
          cwd: artkE2ePath,
          stdio: "pipe",
          env: { ...process.env }
        }
      );
      logger2.debug("Foundation modules generated successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger2.warning(`Foundation module generation failed (non-blocking): ${errorMessage}`);
      logger2.debug("Foundation modules will be created by /artk.discover-foundation prompt");
    }
  } else {
    logger2.debug("Foundation generator not found in vendor, using stubs only");
  }
  await createAdditionalModuleStubs(artkE2ePath);
  await copyFoundationValidationSpec(artkE2ePath, logger2);
  await fs6.ensureDir(artkDir);
  const context = {
    variant: options.variant,
    variantInstalledAt: (/* @__PURE__ */ new Date()).toISOString(),
    nodeVersion: options.nodeMajor,
    moduleSystem: options.moduleSystem,
    playwrightVersion: options.variantDef.playwrightVersion,
    artkVersion: getArtkVersion(),
    installMethod: "cli",
    overrideUsed: false
  };
  await fs6.writeJson(
    path5.join(artkDir, "context.json"),
    {
      version: 1,
      // Integer version as per schema
      projectRoot: projectPath,
      artkRoot: artkE2ePath,
      initialized_at: (/* @__PURE__ */ new Date()).toISOString(),
      next_suggested: "/artk.init-playbook",
      // Variant-specific metadata
      ...context
    },
    { spaces: 2 }
  );
  await fs6.writeFile(
    path5.join(artkDir, ".gitignore"),
    `# ARTK temporary files
browsers/
heal-logs/
logs/
*.heal.json
selector-catalog.local.json
`
  );
}
async function createAdditionalModuleStubs(artkE2ePath) {
  const foundationPath = path5.join(artkE2ePath, "src", "modules", "foundation");
  await fs6.ensureDir(path5.join(foundationPath, "selectors"));
  await fs6.writeFile(
    path5.join(foundationPath, "selectors", "index.ts"),
    `/**
 * Selectors Module - Locator utilities
 *
 * This file will be populated by /artk.discover-foundation
 * Provides data-testid helpers and selector utilities.
 */

import type { Page, Locator } from '@playwright/test';

/**
 * Get element by data-testid
 */
export function getByTestId(page: Page, testId: string): Locator {
  return page.locator(\`[data-testid="\${testId}"]\`);
}

/**
 * Get all elements by data-testid prefix
 */
export function getAllByTestIdPrefix(page: Page, prefix: string): Locator {
  return page.locator(\`[data-testid^="\${prefix}"]\`);
}
`
  );
  await fs6.ensureDir(path5.join(foundationPath, "data"));
  await fs6.writeFile(
    path5.join(foundationPath, "data", "index.ts"),
    `/**
 * Data Module - Test data builders and cleanup
 *
 * This file will be populated by /artk.discover-foundation
 * Provides test data factories and cleanup utilities.
 */

/**
 * Generate unique test identifier
 */
export function generateTestId(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return \`\${prefix}_\${timestamp}_\${random}\`;
}

/**
 * Cleanup registry for test data
 */
const cleanupRegistry: Array<() => Promise<void>> = [];

export function registerCleanup(fn: () => Promise<void>): void {
  cleanupRegistry.push(fn);
}

export async function runCleanup(): Promise<void> {
  for (const cleanup of cleanupRegistry.reverse()) {
    await cleanup();
  }
  cleanupRegistry.length = 0;
}
`
  );
  await fs6.writeFile(
    path5.join(artkE2ePath, "src", "modules", "features", "index.ts"),
    `/**
 * Feature Modules - Journey-specific page objects
 *
 * These modules are created as Journeys are implemented and provide
 * page objects and flows for specific feature areas.
 */

export {};
`
  );
}
async function copyFoundationValidationSpec(artkE2ePath, logger2) {
  const validationSpecDest = path5.join(artkE2ePath, "tests", "foundation", "foundation.validation.spec.ts");
  await fs6.ensureDir(path5.dirname(validationSpecDest));
  const bundledTemplate = readBundledTemplate("foundation.validation.spec.ts");
  if (bundledTemplate) {
    await fs6.writeFile(validationSpecDest, bundledTemplate);
    logger2.debug("Created foundation validation tests from template");
    return;
  }
  await fs6.writeFile(
    validationSpecDest,
    `import { test, expect } from '@playwright/test';

test.describe('ARTK Foundation Validation', () => {
  test('baseURL is configured', async ({ baseURL }) => {
    expect(baseURL).toBeTruthy();
    expect(baseURL).toMatch(/^https?:\\/\\//);
  });

  test('baseURL is not a placeholder', async ({ baseURL }) => {
    expect(baseURL).not.toContain('\${');
  });

  test('Playwright is correctly installed', async ({ browserName }) => {
    expect(browserName).toBeTruthy();
  });
});
`
  );
  logger2.debug("Created foundation validation tests (fallback)");
}
async function runNpmInstall(artkE2ePath, logsDir, logger2) {
  const logFile = path5.join(logsDir, "npm-install.log");
  return new Promise((resolve7, reject) => {
    logger2.startSpinner("Installing dependencies...");
    const logLines = [`npm install started - ${(/* @__PURE__ */ new Date()).toISOString()}`];
    logLines.push(`Working directory: ${artkE2ePath}`);
    const child = spawn("npm", ["install", "--legacy-peer-deps"], {
      cwd: artkE2ePath,
      env: {
        ...process.env,
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1"
      },
      shell: true,
      stdio: "pipe"
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      logLines.push(`Exit code: ${code}`);
      logLines.push("--- STDOUT ---");
      logLines.push(stdout || "(empty)");
      logLines.push("--- STDERR ---");
      logLines.push(stderr || "(empty)");
      try {
        fs6.writeFileSync(logFile, logLines.join("\n"));
      } catch {
      }
      if (code === 0) {
        logger2.succeedSpinner("Dependencies installed");
        resolve7();
      } else {
        logger2.failSpinner("npm install failed");
        logger2.debug(`Details saved to: ${logFile}`);
        reject(new Error(`npm install failed with code ${code}. See ${logFile} for details.`));
      }
    });
    child.on("error", (error) => {
      logLines.push(`Process error: ${error.message}`);
      try {
        fs6.writeFileSync(logFile, logLines.join("\n"));
      } catch {
      }
      logger2.failSpinner("npm install failed");
      reject(error);
    });
    setTimeout(() => {
      logLines.push("TIMEOUT: Installation took longer than 5 minutes");
      try {
        fs6.writeFileSync(logFile, logLines.join("\n"));
      } catch {
      }
      child.kill();
      logger2.failSpinner("npm install timed out");
      reject(new Error("npm install timed out"));
    }, 3e5);
  });
}
async function updateContextJson(artkDir, updates) {
  const contextPath = path5.join(artkDir, "context.json");
  let context = {};
  if (fs6.existsSync(contextPath)) {
    context = await fs6.readJson(contextPath);
  }
  Object.assign(context, updates);
  await fs6.writeJson(contextPath, context, { spaces: 2 });
}
function getAssetsDir() {
  const possiblePaths = [
    path5.join(__dirname2, "..", "..", "assets"),
    path5.join(__dirname2, "..", "assets"),
    path5.join(__dirname2, "assets")
  ];
  for (const p of possiblePaths) {
    if (fs6.existsSync(p)) {
      return p;
    }
  }
  return path5.join(__dirname2, "..", "..", "assets");
}
function printSuccessSummary(logger2, projectPath, artkE2ePath, browserInfo) {
  logger2.blank();
  logger2.header("ARTK Installation Complete!");
  logger2.blank();
  logger2.info("Installed:");
  logger2.list([
    "artk-e2e/                             - E2E test workspace",
    "artk-e2e/vendor/artk-core/            - @artk/core (vendored)",
    "artk-e2e/vendor/artk-core-autogen/    - @artk/core-autogen (vendored)",
    "artk-e2e/package.json                 - Test workspace dependencies",
    "artk-e2e/playwright.config.ts         - Playwright configuration",
    "artk-e2e/tsconfig.json                - TypeScript configuration",
    "artk-e2e/artk.config.yml              - ARTK configuration",
    ".github/prompts/                      - Copilot prompts",
    ".artk/context.json                    - ARTK context",
    ".artk/browsers/                       - Playwright browsers cache"
  ]);
  if (browserInfo) {
    logger2.blank();
    logger2.info("Browser configuration:");
    logger2.table([
      { label: "channel", value: browserInfo.channel },
      { label: "strategy", value: browserInfo.strategy },
      ...browserInfo.path ? [{ label: "path", value: browserInfo.path }] : []
    ]);
  }
  logger2.nextSteps([
    "cd artk-e2e",
    "Open VS Code and use /artk.init-playbook in Copilot Chat"
  ]);
  logger2.info("Run tests:");
  logger2.list(["cd artk-e2e && npm test"]);
}
function getPlaywrightConfigTemplate() {
  const bundledTemplate = readBundledTemplate("playwright.config.template.ts");
  if (bundledTemplate) {
    return bundledTemplate;
  }
  return `import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

function loadArtkConfig(): Record<string, any> {
  const configPath = path.join(__dirname, 'artk.config.yml');
  if (!fs.existsSync(configPath)) {
    console.warn('[ARTK] Config not found, using defaults');
    return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
  }
  try {
    const yaml = require('yaml');
    return yaml.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (e: any) {
    console.error(\`[ARTK] Failed to parse artk.config.yml: \${e.message}\`);
    return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
  }
}

const _missingEnvVars: string[] = [];

function resolveEnvVars(value: string): string {
  if (typeof value !== 'string') return String(value);
  return value.replace(
    /\\$\\{([A-Z_][A-Z0-9_]*)(:-([^}]*))?\\}/gi,
    (match, varName, _hasDefault, defaultValue) => {
      const envValue = process.env[varName];
      if (envValue !== undefined && envValue !== '') return envValue;
      if (defaultValue !== undefined) return defaultValue;
      _missingEnvVars.push(varName);
      return '';
    }
  );
}

const artkConfig = loadArtkConfig();
const env = process.env.ARTK_ENV || 'local';
const rawBaseUrl = artkConfig.environments?.[env]?.baseUrl || 'http://localhost:3000';
const baseURL = resolveEnvVars(rawBaseUrl);
const browserChannel = artkConfig.browsers?.channel;

if (_missingEnvVars.length > 0) {
  const unique = [...new Set(_missingEnvVars)];
  console.warn(\`[ARTK] Missing env vars (no defaults): \${unique.join(', ')}\`);
}

const browserUse: Record<string, any> = { ...devices['Desktop Chrome'] };
if (browserChannel && browserChannel !== 'bundled') {
  browserUse.channel = browserChannel;
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],
  timeout: artkConfig.settings?.timeout || 30000,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'setup', testMatch: /.*\\.setup\\.ts/ },
    { name: 'chromium', use: browserUse, dependencies: ['setup'] },
    { name: 'validation', testMatch: /foundation\\.validation\\.spec\\.ts/, use: { ...browserUse, baseURL } },
  ],
});
`;
}
function getArtkConfigTemplate(projectName) {
  return `# ARTK Configuration
# Generated by @artk/cli on ${(/* @__PURE__ */ new Date()).toISOString()}

version: 1

app:
  name: "${projectName}"
  type: web
  description: "E2E tests for ${projectName}"

environments:
  local:
    baseUrl: \${ARTK_BASE_URL:-http://localhost:3000}
  intg:
    baseUrl: \${ARTK_INTG_URL:-https://intg.example.com}
  ctlq:
    baseUrl: \${ARTK_CTLQ_URL:-https://ctlq.example.com}
  prod:
    baseUrl: \${ARTK_PROD_URL:-https://example.com}

auth:
  provider: oidc
  storageStateDir: ./.auth-states
  # roles:
  #   admin:
  #     username: \${ADMIN_USER}
  #     password: \${ADMIN_PASS}

settings:
  parallel: true
  retries: 2
  timeout: 30000
  traceOnFailure: true

browsers:
  enabled:
    - chromium
  channel: bundled
  strategy: auto
  viewport:
    width: 1280
    height: 720
  headless: true
`;
}

// src/lib/variants/variant-types.ts
function isVariantId(value) {
  return ["modern-esm", "modern-cjs", "legacy-16", "legacy-14"].includes(value);
}
var VariantIdSchema = z.enum([
  "modern-esm",
  "modern-cjs",
  "legacy-16",
  "legacy-14"
]);
var ModuleSystemSchema = z.enum(["esm", "cjs"]);
var InstallMethodSchema = z.enum(["cli", "bootstrap", "manual"]);
var LogLevelSchema = z.enum(["INFO", "WARN", "ERROR"]);
var OperationTypeSchema = z.enum([
  "install",
  "upgrade",
  "rollback",
  "detect"
]);
var LockOperationSchema = z.enum(["install", "upgrade"]);
var UpgradeRecordSchema = z.object({
  from: VariantIdSchema,
  to: VariantIdSchema,
  at: z.string().datetime()
});
z.object({
  variant: VariantIdSchema,
  variantInstalledAt: z.string().datetime(),
  nodeVersion: z.number().int().min(14).max(30),
  moduleSystem: ModuleSystemSchema,
  playwrightVersion: z.string().regex(/^\d+\.\d+\.x$/),
  artkVersion: z.string(),
  installMethod: InstallMethodSchema,
  overrideUsed: z.boolean().optional(),
  previousVariant: VariantIdSchema.optional(),
  upgradeHistory: z.array(UpgradeRecordSchema).optional()
});
z.object({
  pid: z.number().int().positive(),
  startedAt: z.string().datetime(),
  operation: LockOperationSchema
});
z.object({
  timestamp: z.string().datetime(),
  level: LogLevelSchema,
  operation: OperationTypeSchema,
  message: z.string(),
  details: z.record(z.unknown()).optional()
});
var FeatureEntrySchema = z.object({
  available: z.boolean(),
  alternative: z.string().optional(),
  notes: z.string().optional(),
  sincePlaywright: z.string().regex(/^\d+\.\d+$/).optional()
});
z.object({
  variant: VariantIdSchema,
  playwrightVersion: z.string().regex(/^\d+\.\d+\.x$/),
  nodeRange: z.array(z.string().regex(/^\d+$/)).min(1),
  moduleSystem: ModuleSystemSchema.optional(),
  features: z.record(FeatureEntrySchema),
  generatedAt: z.string().datetime().optional()
});
z.object({
  id: VariantIdSchema,
  displayName: z.string(),
  nodeRange: z.array(z.string().regex(/^\d+$/)).min(1),
  playwrightVersion: z.string().regex(/^\d+\.\d+\.x$/),
  moduleSystem: ModuleSystemSchema,
  tsTarget: z.string(),
  distDirectory: z.string()
});
z.object({
  nodeVersion: z.number().int().min(1),
  nodeVersionFull: z.string(),
  moduleSystem: ModuleSystemSchema,
  selectedVariant: VariantIdSchema,
  success: z.boolean(),
  error: z.string().optional()
});

// src/commands/init.ts
var LEGACY_VARIANT_MAP = {
  "commonjs": "modern-cjs",
  "cjs": "modern-cjs",
  "esm": "modern-esm"
};
async function initCommand(targetPath, options) {
  const logger2 = new Logger({ verbose: options.verbose });
  let variant = "auto";
  if (options.variant && options.variant !== "auto") {
    if (options.variant in LEGACY_VARIANT_MAP) {
      const mappedVariant = LEGACY_VARIANT_MAP[options.variant];
      logger2.warning(`--variant ${options.variant} is deprecated. Using '${mappedVariant}' instead.`);
      logger2.warning(`For legacy Node.js support, use: --variant legacy-16 or --variant legacy-14`);
      variant = mappedVariant;
    } else if (isVariantId(options.variant)) {
      variant = options.variant;
    } else {
      logger2.error(`Invalid variant: ${options.variant}`);
      logger2.error(`Valid variants: ${ALL_VARIANT_IDS.join(", ")}, auto`);
      logger2.blank();
      logger2.info(getVariantHelpText());
      process.exit(1);
    }
  }
  const bootstrapOptions = {
    skipNpm: options.skipNpm,
    skipBrowsers: options.skipBrowsers,
    force: options.force,
    variant,
    prompts: options.prompts,
    verbose: options.verbose
  };
  try {
    const result = await bootstrap(targetPath, bootstrapOptions);
    if (!result.success) {
      logger2.error("Bootstrap failed");
      if (result.errors.length > 0) {
        logger2.error("Errors:");
        for (const error of result.errors) {
          logger2.error(`  - ${error}`);
        }
      }
      process.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger2.error(`Unexpected error: ${message}`);
    process.exit(1);
  }
}
var MIN_NODE_VERSION2 = "18.0.0";
var MIN_NPM_VERSION = "8.0.0";
async function checkPrerequisites() {
  const results = [];
  results.push(checkNodeVersion());
  results.push(checkNpmVersion());
  results.push(checkGit());
  results.push(await checkBrowsers());
  const passed = results.every((r) => r.status !== "fail");
  return { passed, results };
}
function checkNodeVersion() {
  const version2 = process.version.replace(/^v/, "");
  if (semver.gte(version2, MIN_NODE_VERSION2)) {
    return {
      name: "Node.js",
      status: "pass",
      version: version2,
      required: `>= ${MIN_NODE_VERSION2}`,
      message: `Node.js ${version2} is installed`
    };
  }
  return {
    name: "Node.js",
    status: "fail",
    version: version2,
    required: `>= ${MIN_NODE_VERSION2}`,
    message: `Node.js ${version2} is too old`,
    fix: `Upgrade to Node.js ${MIN_NODE_VERSION2} or later: https://nodejs.org`
  };
}
function checkNpmVersion() {
  try {
    const version2 = execSync("npm --version", { encoding: "utf8" }).trim();
    if (semver.gte(version2, MIN_NPM_VERSION)) {
      return {
        name: "npm",
        status: "pass",
        version: version2,
        required: `>= ${MIN_NPM_VERSION}`,
        message: `npm ${version2} is installed`
      };
    }
    return {
      name: "npm",
      status: "fail",
      version: version2,
      required: `>= ${MIN_NPM_VERSION}`,
      message: `npm ${version2} is too old`,
      fix: `Upgrade npm: npm install -g npm@latest`
    };
  } catch {
    return {
      name: "npm",
      status: "fail",
      message: "npm is not installed or not in PATH",
      fix: "Install Node.js which includes npm: https://nodejs.org"
    };
  }
}
function checkGit() {
  try {
    const version2 = execSync("git --version", { encoding: "utf8" }).trim();
    const match = version2.match(/(\d+\.\d+\.\d+)/);
    const versionNum = match ? match[1] : "unknown";
    return {
      name: "Git",
      status: "pass",
      version: versionNum,
      message: `Git ${versionNum} is installed`
    };
  } catch {
    return {
      name: "Git",
      status: "warn",
      message: "Git is not installed or not in PATH",
      fix: "Install Git: https://git-scm.com"
    };
  }
}
async function checkBrowsers() {
  const browsers = [];
  if (await checkSystemBrowser("msedge")) {
    browsers.push("Microsoft Edge");
  }
  if (await checkSystemBrowser("chrome")) {
    browsers.push("Google Chrome");
  }
  const playwrightBrowsersPath = getPlaywrightBrowsersPath();
  if (playwrightBrowsersPath && fs2.existsSync(playwrightBrowsersPath)) {
    const entries = fs2.readdirSync(playwrightBrowsersPath);
    if (entries.some((e) => e.startsWith("chromium-"))) {
      browsers.push("Playwright Chromium");
    }
  }
  if (browsers.length > 0) {
    return {
      name: "Browsers",
      status: "pass",
      message: `Available: ${browsers.join(", ")}`
    };
  }
  return {
    name: "Browsers",
    status: "warn",
    message: "No browsers detected (will be installed during init)",
    fix: "Run: npx playwright install chromium"
  };
}
async function checkSystemBrowser(browser) {
  const paths = getBrowserPaths2(browser);
  for (const browserPath of paths) {
    if (fs2.existsSync(browserPath)) {
      return true;
    }
  }
  try {
    const commands = browser === "msedge" ? ["microsoft-edge", "microsoft-edge-stable", "msedge"] : ["google-chrome", "google-chrome-stable", "chrome"];
    for (const cmd of commands) {
      try {
        execSync(`${cmd} --version`, { encoding: "utf8", stdio: "pipe" });
        return true;
      } catch {
      }
    }
  } catch {
  }
  return false;
}
function getBrowserPaths2(browser) {
  const paths = [];
  if (process.platform === "win32") {
    const programFiles = process.env["ProgramFiles"] || "C:\\Program Files";
    const programFilesX86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
    const localAppData = process.env["LOCALAPPDATA"] || "";
    if (browser === "msedge") {
      paths.push(
        `${programFilesX86}\\Microsoft\\Edge\\Application\\msedge.exe`,
        `${programFiles}\\Microsoft\\Edge\\Application\\msedge.exe`,
        `${localAppData}\\Microsoft\\Edge\\Application\\msedge.exe`
      );
    } else {
      paths.push(
        `${programFiles}\\Google\\Chrome\\Application\\chrome.exe`,
        `${programFilesX86}\\Google\\Chrome\\Application\\chrome.exe`,
        `${localAppData}\\Google\\Chrome\\Application\\chrome.exe`
      );
    }
  } else if (process.platform === "darwin") {
    if (browser === "msedge") {
      paths.push("/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge");
    } else {
      paths.push("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome");
    }
  } else {
    if (browser === "msedge") {
      paths.push(
        "/usr/bin/microsoft-edge",
        "/usr/bin/microsoft-edge-stable",
        "/snap/bin/microsoft-edge"
      );
    } else {
      paths.push(
        "/usr/bin/google-chrome",
        "/usr/bin/google-chrome-stable",
        "/snap/bin/chromium",
        "/usr/bin/chromium-browser"
      );
    }
  }
  return paths;
}
function getPlaywrightBrowsersPath() {
  if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
    return process.env.PLAYWRIGHT_BROWSERS_PATH;
  }
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA;
    if (localAppData) {
      return `${localAppData}\\ms-playwright`;
    }
  } else if (process.platform === "darwin") {
    const home = process.env.HOME;
    if (home) {
      return `${home}/Library/Caches/ms-playwright`;
    }
  } else {
    const home = process.env.HOME;
    if (home) {
      return `${home}/.cache/ms-playwright`;
    }
  }
  return null;
}
function printPrerequisitesReport(result, logger2) {
  logger2.blank();
  for (const check of result.results) {
    check.status === "pass" ? "\u2713" : check.status === "fail" ? "\u2717" : "\u26A0";
    check.status === "pass" ? "green" : check.status === "fail" ? "red" : "yellow";
    if (check.status === "pass") {
      logger2.success(`${check.name}: ${check.message}`);
    } else if (check.status === "fail") {
      logger2.error(`${check.name}: ${check.message}`);
      if (check.fix) {
        logger2.info(`  Fix: ${check.fix}`);
      }
    } else {
      logger2.warning(`${check.name}: ${check.message}`);
      if (check.fix) {
        logger2.info(`  Fix: ${check.fix}`);
      }
    }
  }
  logger2.blank();
  if (result.passed) {
    logger2.success("All prerequisites satisfied!");
  } else {
    logger2.error("Some prerequisites are not met. Please fix the issues above.");
  }
}
var __filename3 = fileURLToPath(import.meta.url);
var __dirname3 = path5.dirname(__filename3);
function getVersion() {
  try {
    const possiblePaths = [
      path5.join(__dirname3, "..", "..", "package.json"),
      path5.join(__dirname3, "..", "package.json"),
      path5.join(__dirname3, "package.json")
    ];
    for (const pkgPath of possiblePaths) {
      if (fs2.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs2.readFileSync(pkgPath, "utf8"));
        return pkg.version || "0.0.0";
      }
    }
    return "0.0.0";
  } catch {
    return "0.0.0";
  }
}
function getCoreVersion() {
  try {
    const possiblePaths = [
      path5.join(__dirname3, "..", "..", "assets", "core", "package.json"),
      path5.join(__dirname3, "..", "assets", "core", "package.json")
    ];
    for (const pkgPath of possiblePaths) {
      if (fs2.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs2.readFileSync(pkgPath, "utf8"));
        return pkg.version || "0.0.0";
      }
    }
    return "0.0.0";
  } catch {
    return "0.0.0";
  }
}

// src/commands/check.ts
async function checkCommand(options) {
  const logger2 = new Logger();
  logger2.header("ARTK Prerequisites Check");
  logger2.info("Versions:");
  logger2.table([
    { label: "@artk/cli", value: getVersion() },
    { label: "@artk/core", value: getCoreVersion() }
  ]);
  logger2.blank();
  logger2.info("Checking prerequisites...");
  const result = await checkPrerequisites();
  printPrerequisitesReport(result, logger2);
  if (!result.passed) {
    process.exit(1);
  }
}
var __filename4 = fileURLToPath(import.meta.url);
var __dirname4 = path5.dirname(__filename4);
async function upgradeCommand(targetPath, options) {
  const logger2 = new Logger();
  const resolvedPath = path5.resolve(targetPath);
  const artkE2ePath = path5.join(resolvedPath, "artk-e2e");
  logger2.header("ARTK Upgrade");
  if (!fs6.existsSync(artkE2ePath)) {
    logger2.error("ARTK is not installed in this project.");
    logger2.info("Run: artk init <path>");
    process.exit(1);
  }
  const vendorCorePath = path5.join(artkE2ePath, "vendor", "artk-core", "package.json");
  let currentVersion = "unknown";
  if (fs6.existsSync(vendorCorePath)) {
    try {
      const pkg = await fs6.readJson(vendorCorePath);
      currentVersion = pkg.version || "unknown";
    } catch {
    }
  }
  const availableVersion = getCoreVersion();
  logger2.info("Version information:");
  logger2.table([
    { label: "Installed", value: currentVersion },
    { label: "Available", value: availableVersion }
  ]);
  logger2.blank();
  if (options.check) {
    if (currentVersion === availableVersion) {
      logger2.success("Already up to date!");
    } else {
      logger2.info(`Update available: ${currentVersion} \u2192 ${availableVersion}`);
      logger2.info("Run: artk upgrade <path>");
    }
    return;
  }
  if (currentVersion === availableVersion && !options.force) {
    logger2.success("Already up to date!");
    return;
  }
  logger2.startSpinner("Upgrading @artk/core...");
  try {
    const assetsDir = getAssetsDir2();
    const coreSource = path5.join(assetsDir, "core");
    const coreTarget = path5.join(artkE2ePath, "vendor", "artk-core");
    if (fs6.existsSync(coreSource)) {
      await fs6.remove(coreTarget);
      await fs6.copy(coreSource, coreTarget);
    } else {
      logger2.failSpinner("Upgrade failed");
      logger2.error("Core assets not found in CLI package");
      process.exit(1);
    }
    const autogenSource = path5.join(assetsDir, "autogen");
    const autogenTarget = path5.join(artkE2ePath, "vendor", "artk-core-autogen");
    if (fs6.existsSync(autogenSource)) {
      await fs6.remove(autogenTarget);
      await fs6.copy(autogenSource, autogenTarget);
    }
    logger2.succeedSpinner("Upgrade complete!");
    logger2.blank();
    logger2.success(`Upgraded: ${currentVersion} \u2192 ${availableVersion}`);
    logger2.blank();
    logger2.info("You may need to run npm install to update dependencies:");
    logger2.list(["cd artk-e2e && npm install"]);
  } catch (error) {
    logger2.failSpinner("Upgrade failed");
    const message = error instanceof Error ? error.message : String(error);
    logger2.error(message);
    process.exit(1);
  }
}
function getAssetsDir2() {
  const possiblePaths = [
    path5.join(__dirname4, "..", "..", "assets"),
    path5.join(__dirname4, "..", "assets"),
    path5.join(__dirname4, "assets")
  ];
  for (const p of possiblePaths) {
    if (fs6.existsSync(p)) {
      return p;
    }
  }
  return path5.join(__dirname4, "..", "..", "assets");
}
async function doctorCommand(targetPath, options) {
  const logger2 = new Logger({ verbose: options.verbose });
  const resolvedPath = path5.resolve(targetPath);
  const artkE2ePath = path5.join(resolvedPath, "artk-e2e");
  path5.join(resolvedPath, ".artk");
  logger2.header("ARTK Doctor");
  logger2.info(`Diagnosing: ${resolvedPath}`);
  logger2.blank();
  const diagnostics = [];
  diagnostics.push(await checkArtkInstallation(resolvedPath, artkE2ePath));
  diagnostics.push(await checkNodeModules(artkE2ePath));
  diagnostics.push(await checkPlaywrightBrowsers(resolvedPath, artkE2ePath, logger2));
  diagnostics.push(await checkConfigFiles(artkE2ePath));
  diagnostics.push(await checkVendorPackages(artkE2ePath));
  diagnostics.push(await checkTypeScript(artkE2ePath));
  logger2.blank();
  logger2.info("Diagnostic Results:");
  logger2.blank();
  let hasErrors = false;
  let hasWarnings = false;
  const fixable = [];
  for (const diag of diagnostics) {
    if (diag.status === "ok") {
      logger2.success(`${diag.name}: ${diag.message}`);
    } else if (diag.status === "warn") {
      logger2.warning(`${diag.name}: ${diag.message}`);
      hasWarnings = true;
      if (diag.fix) fixable.push(diag);
    } else {
      logger2.error(`${diag.name}: ${diag.message}`);
      hasErrors = true;
      if (diag.fix) fixable.push(diag);
    }
  }
  logger2.blank();
  if (options.fix && fixable.length > 0) {
    logger2.info("Attempting to fix issues...");
    logger2.blank();
    for (const diag of fixable) {
      if (diag.fix) {
        logger2.startSpinner(`Fixing: ${diag.name}...`);
        try {
          await diag.fix();
          logger2.succeedSpinner(`Fixed: ${diag.name}`);
        } catch (error) {
          logger2.failSpinner(`Failed to fix: ${diag.name}`);
          const message = error instanceof Error ? error.message : String(error);
          logger2.debug(message);
        }
      }
    }
    logger2.blank();
    logger2.info('Re-run "artk doctor" to verify fixes.');
  } else if (fixable.length > 0 && !options.fix) {
    logger2.info(`Found ${fixable.length} fixable issue(s). Run with --fix to attempt automatic fixes.`);
  }
  if (hasErrors) {
    logger2.blank();
    logger2.error("Some issues require attention.");
    process.exit(1);
  } else if (hasWarnings) {
    logger2.blank();
    logger2.warning("Some warnings were found, but ARTK should work.");
  } else {
    logger2.blank();
    logger2.success("All checks passed! ARTK is healthy.");
  }
}
async function checkArtkInstallation(projectPath, artkE2ePath) {
  if (!fs6.existsSync(artkE2ePath)) {
    return {
      name: "ARTK Installation",
      status: "error",
      message: "artk-e2e directory not found"
    };
  }
  const contextPath = path5.join(projectPath, ".artk", "context.json");
  if (!fs6.existsSync(contextPath)) {
    return {
      name: "ARTK Installation",
      status: "warn",
      message: "Missing .artk/context.json",
      fix: async () => {
        await fs6.ensureDir(path5.join(projectPath, ".artk"));
        await fs6.writeJson(contextPath, {
          version: "1.0",
          projectRoot: projectPath,
          artkRoot: artkE2ePath,
          initialized_at: (/* @__PURE__ */ new Date()).toISOString()
        }, { spaces: 2 });
      }
    };
  }
  return {
    name: "ARTK Installation",
    status: "ok",
    message: "Properly installed"
  };
}
async function checkNodeModules(artkE2ePath) {
  const nodeModulesPath = path5.join(artkE2ePath, "node_modules");
  if (!fs6.existsSync(nodeModulesPath)) {
    return {
      name: "Dependencies",
      status: "error",
      message: "node_modules not found",
      fix: async () => {
        execSync("npm install --legacy-peer-deps", { cwd: artkE2ePath, stdio: "pipe" });
      }
    };
  }
  const playwrightPath = path5.join(nodeModulesPath, "@playwright", "test");
  if (!fs6.existsSync(playwrightPath)) {
    return {
      name: "Dependencies",
      status: "error",
      message: "@playwright/test not installed",
      fix: async () => {
        execSync("npm install --legacy-peer-deps", { cwd: artkE2ePath, stdio: "pipe" });
      }
    };
  }
  return {
    name: "Dependencies",
    status: "ok",
    message: "All dependencies installed"
  };
}
async function checkPlaywrightBrowsers(projectPath, artkE2ePath, logger2) {
  const browsersCachePath = path5.join(projectPath, ".artk", "browsers");
  const hasCachedBrowsers = fs6.existsSync(browsersCachePath) && fs6.readdirSync(browsersCachePath).some((f) => f.startsWith("chromium-"));
  if (hasCachedBrowsers) {
    return {
      name: "Playwright Browsers",
      status: "ok",
      message: "Browsers cached in .artk/browsers/"
    };
  }
  const configPath = path5.join(artkE2ePath, "artk.config.yml");
  if (fs6.existsSync(configPath)) {
    const content = fs6.readFileSync(configPath, "utf8");
    if (content.includes("channel: msedge") || content.includes("channel: chrome")) {
      return {
        name: "Playwright Browsers",
        status: "ok",
        message: "Using system browser"
      };
    }
  }
  return {
    name: "Playwright Browsers",
    status: "warn",
    message: "No browsers configured",
    fix: async () => {
      await resolveBrowser(projectPath, logger2);
    }
  };
}
async function checkConfigFiles(artkE2ePath) {
  const requiredFiles = [
    "package.json",
    "playwright.config.ts",
    "tsconfig.json",
    "artk.config.yml"
  ];
  const missing = [];
  for (const file of requiredFiles) {
    if (!fs6.existsSync(path5.join(artkE2ePath, file))) {
      missing.push(file);
    }
  }
  if (missing.length > 0) {
    return {
      name: "Configuration Files",
      status: "error",
      message: `Missing: ${missing.join(", ")}`
    };
  }
  return {
    name: "Configuration Files",
    status: "ok",
    message: "All configuration files present"
  };
}
async function checkVendorPackages(artkE2ePath) {
  const vendorCore = path5.join(artkE2ePath, "vendor", "artk-core");
  const vendorAutogen = path5.join(artkE2ePath, "vendor", "artk-core-autogen");
  const issues = [];
  if (!fs6.existsSync(path5.join(vendorCore, "package.json"))) {
    issues.push("@artk/core");
  }
  if (!fs6.existsSync(path5.join(vendorAutogen, "package.json"))) {
    issues.push("@artk/core-autogen");
  }
  if (issues.length > 0) {
    return {
      name: "Vendor Packages",
      status: "error",
      message: `Missing: ${issues.join(", ")}`
    };
  }
  return {
    name: "Vendor Packages",
    status: "ok",
    message: "Vendor packages installed"
  };
}
async function checkTypeScript(artkE2ePath) {
  if (!fs6.existsSync(path5.join(artkE2ePath, "node_modules"))) {
    return {
      name: "TypeScript",
      status: "warn",
      message: "Cannot check - node_modules missing"
    };
  }
  try {
    execSync("npx tsc --noEmit", { cwd: artkE2ePath, stdio: "pipe" });
    return {
      name: "TypeScript",
      status: "ok",
      message: "No type errors"
    };
  } catch (error) {
    return {
      name: "TypeScript",
      status: "warn",
      message: 'Type errors found (run "npm run typecheck" for details)'
    };
  }
}
async function uninstallCommand(targetPath, options) {
  const logger2 = new Logger();
  const resolvedPath = path5.resolve(targetPath);
  const artkE2ePath = path5.join(resolvedPath, "artk-e2e");
  const artkDir = path5.join(resolvedPath, ".artk");
  const promptsDir = path5.join(resolvedPath, ".github", "prompts");
  logger2.header("ARTK Uninstall");
  if (!fs6.existsSync(artkE2ePath) && !fs6.existsSync(artkDir)) {
    logger2.error("ARTK is not installed in this project.");
    process.exit(1);
  }
  logger2.info("The following will be removed:");
  logger2.blank();
  const toRemove = [];
  if (fs6.existsSync(artkE2ePath)) {
    if (options.keepTests) {
      toRemove.push({
        path: path5.join(artkE2ePath, "vendor"),
        description: "artk-e2e/vendor/ (vendored packages)"
      });
      toRemove.push({
        path: path5.join(artkE2ePath, "node_modules"),
        description: "artk-e2e/node_modules/"
      });
    } else {
      toRemove.push({
        path: artkE2ePath,
        description: "artk-e2e/ (entire directory)"
      });
    }
  }
  if (fs6.existsSync(artkDir)) {
    toRemove.push({
      path: artkDir,
      description: ".artk/ (ARTK metadata and browser cache)"
    });
  }
  if (!options.keepPrompts && fs6.existsSync(promptsDir)) {
    const artkPrompts = fs6.readdirSync(promptsDir).filter((f) => f.startsWith("artk.") && f.endsWith(".prompt.md"));
    if (artkPrompts.length > 0) {
      for (const prompt of artkPrompts) {
        toRemove.push({
          path: path5.join(promptsDir, prompt),
          description: `.github/prompts/${prompt}`
        });
      }
    }
  }
  if (toRemove.length === 0) {
    logger2.info("Nothing to remove.");
    return;
  }
  for (const item of toRemove) {
    logger2.list([item.description]);
  }
  logger2.blank();
  if (!options.force) {
    const confirmed = await confirmUninstall();
    if (!confirmed) {
      logger2.info("Uninstall cancelled.");
      return;
    }
  }
  logger2.startSpinner("Removing ARTK...");
  try {
    for (const item of toRemove) {
      if (fs6.existsSync(item.path)) {
        await fs6.remove(item.path);
      }
    }
    if (fs6.existsSync(promptsDir)) {
      const remaining = fs6.readdirSync(promptsDir);
      if (remaining.length === 0) {
        await fs6.remove(promptsDir);
      }
    }
    const githubDir = path5.join(resolvedPath, ".github");
    if (fs6.existsSync(githubDir)) {
      const remaining = fs6.readdirSync(githubDir);
      if (remaining.length === 0) {
        await fs6.remove(githubDir);
      }
    }
    logger2.succeedSpinner("ARTK removed successfully");
    logger2.blank();
    logger2.success("ARTK has been uninstalled from this project.");
    if (options.keepTests) {
      logger2.info("Test files were preserved in artk-e2e/");
    }
    if (options.keepPrompts) {
      logger2.info("Prompts were preserved in .github/prompts/");
    }
  } catch (error) {
    logger2.failSpinner("Uninstall failed");
    const message = error instanceof Error ? error.message : String(error);
    logger2.error(message);
    process.exit(1);
  }
}
function confirmUninstall() {
  return new Promise((resolve7) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question("Are you sure you want to uninstall? (y/N) ", (answer) => {
      rl.close();
      resolve7(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// src/cli.ts
var version = getVersion();
program.name("artk").description("ARTK - Automatic Regression Testing Kit\n\nBootstrap Playwright test suites with AI-assisted workflows").version(version, "-v, --version", "Output the current version");
program.command("init <path>").description("Initialize ARTK in a project").option("--skip-npm", "Skip npm install").option("--skip-browsers", "Skip browser installation").option("-f, --force", "Overwrite existing installation").option("--variant <type>", "Variant: modern-esm, modern-cjs, legacy-16, legacy-14, or auto (default: auto)", "auto").option("--no-prompts", "Skip installing AI prompts").option("--verbose", "Show detailed output").action(async (targetPath, options) => {
  await initCommand(targetPath, options);
});
program.command("upgrade [path]").description("Upgrade @artk/core in an existing installation").option("--check", "Check for updates without applying").option("-f, --force", "Force upgrade even if versions match").action(async (targetPath, options) => {
  await upgradeCommand(targetPath || ".", options);
});
program.command("check").description("Verify prerequisites (Node.js, npm, browsers)").option("--fix", "Attempt to fix issues automatically").action(async (options) => {
  await checkCommand();
});
program.command("doctor [path]").description("Diagnose and fix common issues in an ARTK installation").option("--fix", "Attempt to fix issues automatically").option("--verbose", "Show detailed diagnostic output").action(async (targetPath, options) => {
  await doctorCommand(targetPath || ".", options);
});
program.command("uninstall <path>").description("Remove ARTK from a project").option("--keep-tests", "Keep test files in artk-e2e/").option("--keep-prompts", "Keep AI prompts in .github/prompts/").option("-f, --force", "Skip confirmation prompt").action(async (targetPath, options) => {
  await uninstallCommand(targetPath, options);
});
program.showHelpAfterError("(add --help for additional information)");
program.parse();
//# sourceMappingURL=cli.js.map
//# sourceMappingURL=cli.js.map