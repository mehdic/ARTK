#!/usr/bin/env node
import { createRequire } from 'module';
import { program } from 'commander';
import { execSync, spawn } from 'child_process';
import fs5 from 'fs-extra';
import * as path4 from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import ora from 'ora';
import * as fs2 from 'fs';
import * as https from 'https';
import * as crypto from 'crypto';
import { z } from 'zod';
import yaml from 'yaml';
import * as readline from 'readline';
import * as semver from 'semver';

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
  const resolvedPath = path4.resolve(projectPath);
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
  const packageJsonPath = path4.join(projectPath, "package.json");
  if (fs2.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs2.readFileSync(packageJsonPath, "utf8"));
      if (pkg.type === "module") {
        return "esm";
      }
      if (pkg.type === "commonjs" || !pkg.type) {
        const hasEsmConfig = fs2.existsSync(path4.join(projectPath, "tsconfig.json"));
        if (hasEsmConfig) {
          try {
            const tsconfig = JSON.parse(fs2.readFileSync(path4.join(projectPath, "tsconfig.json"), "utf8"));
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
  const srcDir = path4.join(projectPath, "src");
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
  if (fs2.existsSync(path4.join(projectPath, ".git"))) {
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
  const playwrightPath = path4.join(projectPath, "node_modules", "@playwright", "test");
  return fs2.existsSync(playwrightPath);
}
function detectArtkCore(projectPath) {
  const vendorPath = path4.join(projectPath, "artk-e2e", "vendor", "artk-core");
  if (fs2.existsSync(vendorPath)) return true;
  const nodeModulesPath = path4.join(projectPath, "node_modules", "@artk", "core");
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
  const artkE2ePath = path4.join(targetPath, "artk-e2e");
  const browsersCachePath = path4.join(targetPath, ".artk", "browsers");
  const logsDir = options.logsDir || path4.join(targetPath, ".artk", "logs");
  fs2.mkdirSync(browsersCachePath, { recursive: true });
  fs2.mkdirSync(logsDir, { recursive: true });
  process.env.PLAYWRIGHT_BROWSERS_PATH = browsersCachePath;
  let strategy = options.strategy || "auto";
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
  const logFile = path4.join(logsDir, "release-cache-download.log");
  const logLines = [`Release cache download attempt - ${(/* @__PURE__ */ new Date()).toISOString()}`];
  const browsersJsonPath = path4.join(artkE2ePath, "node_modules", "playwright-core", "browsers.json");
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
    const cachedPath = path4.join(browsersCachePath, `chromium-${chromium.revision}`);
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
    const playwrightPkgPath = path4.join(artkE2ePath, "node_modules", "@playwright", "test", "package.json");
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
    const zipPath = path4.join(browsersCachePath, asset);
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
        path: path4.join(browsersCachePath, `chromium-${chromium.revision}`),
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
  return new Promise((resolve6, reject) => {
    const file = fs2.createWriteStream(destPath);
    const request = https.get(url, { timeout: timeoutMs }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs2.unlinkSync(destPath);
          downloadFile(redirectUrl, destPath, timeoutMs).then(resolve6).catch(reject);
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
        resolve6();
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
  return new Promise((resolve6, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs2.createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve6(hash.digest("hex").toLowerCase()));
    stream.on("error", reject);
  });
}
async function extractZip(zipPath, destDir) {
  return new Promise((resolve6, reject) => {
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
          resolve6();
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
  const logFile = path4.join(logsDir, "playwright-browser-install.log");
  return new Promise((resolve6) => {
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
        resolve6({
          channel: "bundled",
          version: null,
          path: browsersCachePath,
          strategy: "bundled-install"
        });
      } else {
        logger2.failSpinner("Failed to install Playwright browsers");
        logger2.debug(`Exit code: ${code}`);
        logger2.debug(`Details saved to: ${logFile}`);
        resolve6(null);
      }
    });
    child.on("error", (error) => {
      logLines.push(`Process error: ${error.message}`);
      writeLogFile(logFile, logLines);
      logger2.failSpinner("Failed to install Playwright browsers");
      logger2.debug(`Error: ${error.message}`);
      resolve6(null);
    });
    setTimeout(() => {
      logLines.push("TIMEOUT: Installation took longer than 5 minutes");
      writeLogFile(logFile, logLines);
      child.kill();
      logger2.failSpinner("Browser installation timed out");
      resolve6(null);
    }, 3e5);
  });
}
async function detectSystemBrowser(logsDir, logger2) {
  const logFile = path4.join(logsDir, "system-browser-detect.log");
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
function processTemplate(template, context) {
  let result = template;
  for (const [key, value] of Object.entries(context)) {
    const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(placeholder, String(value));
  }
  return result;
}
async function generateFoundationModules(artkE2ePath, assetsDir, context, logger2) {
  const result = {
    success: true,
    filesGenerated: [],
    errors: [],
    warnings: []
  };
  const modules = [
    { template: "auth/login.ts", target: "src/modules/foundation/auth/login.ts" },
    { template: "config/env.ts", target: "src/modules/foundation/config/env.ts" },
    { template: "navigation/nav.ts", target: "src/modules/foundation/navigation/nav.ts" }
  ];
  const variant = context.moduleSystem === "esm" ? "esm" : "commonjs";
  const templatesDir = path4.join(assetsDir, "core", "templates", variant);
  if (!fs2.existsSync(templatesDir)) {
    logger2.warning(`Template directory not found: ${templatesDir}`);
    logger2.debug("Generating basic foundation stubs instead");
    result.warnings.push("Templates not found, generated basic stubs");
    await generateBasicStubs(artkE2ePath, context, logger2);
    return result;
  }
  for (const module of modules) {
    const templatePath = path4.join(templatesDir, module.template);
    const targetPath = path4.join(artkE2ePath, module.target);
    try {
      if (!fs2.existsSync(templatePath)) {
        logger2.debug(`Template not found: ${templatePath}`);
        result.warnings.push(`Template not found: ${module.template}`);
        continue;
      }
      const templateContent = fs2.readFileSync(templatePath, "utf8");
      const processedContent = processTemplate(templateContent, context);
      const targetDir = path4.dirname(targetPath);
      if (!fs2.existsSync(targetDir)) {
        fs2.mkdirSync(targetDir, { recursive: true });
      }
      fs2.writeFileSync(targetPath, processedContent, "utf8");
      result.filesGenerated.push(targetPath);
      logger2.debug(`Generated: ${module.target}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push({ file: module.target, error: errorMessage });
      result.success = false;
      logger2.debug(`Failed to generate ${module.target}: ${errorMessage}`);
    }
  }
  await generateIndexFiles(artkE2ePath, context, logger2);
  return result;
}
async function generateBasicStubs(artkE2ePath, context, logger2) {
  const foundationPath = path4.join(artkE2ePath, "src", "modules", "foundation");
  const loginStub = context.moduleSystem === "esm" ? getEsmLoginStub(context) : getCjsLoginStub(context);
  await writeFile(path4.join(foundationPath, "auth", "login.ts"), loginStub);
  const envStub = context.moduleSystem === "esm" ? getEsmEnvStub(context) : getCjsEnvStub(context);
  await writeFile(path4.join(foundationPath, "config", "env.ts"), envStub);
  const navStub = context.moduleSystem === "esm" ? getEsmNavStub(context) : getCjsNavStub(context);
  await writeFile(path4.join(foundationPath, "navigation", "nav.ts"), navStub);
  logger2.debug("Generated basic foundation stubs");
}
async function generateIndexFiles(artkE2ePath, context, logger2) {
  const foundationPath = path4.join(artkE2ePath, "src", "modules", "foundation");
  await writeFile(
    path4.join(foundationPath, "index.ts"),
    `/**
 * Foundation Modules - Core testing infrastructure
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 *
 * These modules provide:
 * - Auth: Login flows and storage state management
 * - Config: Environment configuration loading
 * - Navigation: Route helpers and URL builders
 */

export * from './auth/login';
export * from './config/env';
export * from './navigation/nav';
`
  );
  await writeFile(
    path4.join(foundationPath, "auth", "index.ts"),
    `/**
 * Authentication Module
 * Generated for: ${context.projectName}
 */
export * from './login';
`
  );
  await writeFile(
    path4.join(foundationPath, "config", "index.ts"),
    `/**
 * Configuration Module
 * Generated for: ${context.projectName}
 */
export * from './env';
`
  );
  await writeFile(
    path4.join(foundationPath, "navigation", "index.ts"),
    `/**
 * Navigation Module
 * Generated for: ${context.projectName}
 */
export * from './nav';
`
  );
  logger2.debug("Generated foundation index files");
}
async function writeFile(filePath, content) {
  const dir = path4.dirname(filePath);
  if (!fs2.existsSync(dir)) {
    fs2.mkdirSync(dir, { recursive: true });
  }
  fs2.writeFileSync(filePath, content, "utf8");
}
function getEsmLoginStub(context) {
  return `/**
 * ESM Authentication Login Module
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 */
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';
import type { Page } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Perform login action
 */
export async function login(page: Page, username: string, password: string): Promise<void> {
  // Navigate to login page
  await page.goto('/login');

  // Fill credentials - update selectors for your app
  await page.fill('[data-testid="username"]', username);
  await page.fill('[data-testid="password"]', password);

  // Submit
  await page.click('[data-testid="login-button"]');

  // Wait for navigation
  await page.waitForURL('**/dashboard');
}

/**
 * Save authentication state
 */
export async function saveAuthState(page: Page, statePath?: string): Promise<void> {
  const fullPath = statePath || path.join('${context.artkRoot}', '${context.authStatePath}', 'user.json');
  await page.context().storageState({ path: fullPath });
}
`;
}
function getCjsLoginStub(context) {
  return `/**
 * CommonJS Authentication Login Module
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 */
import * as path from 'path';
import * as fs from 'fs';
import type { Page } from '@playwright/test';

/**
 * Perform login action
 */
export async function login(page: Page, username: string, password: string): Promise<void> {
  // Navigate to login page
  await page.goto('/login');

  // Fill credentials - update selectors for your app
  await page.fill('[data-testid="username"]', username);
  await page.fill('[data-testid="password"]', password);

  // Submit
  await page.click('[data-testid="login-button"]');

  // Wait for navigation
  await page.waitForURL('**/dashboard');
}

/**
 * Save authentication state
 */
export async function saveAuthState(page: Page, statePath?: string): Promise<void> {
  const fullPath = statePath || path.join('${context.artkRoot}', '${context.authStatePath}', 'user.json');
  await page.context().storageState({ path: fullPath });
}
`;
}
function getEsmEnvStub(context) {
  return `/**
 * ESM Environment Configuration Module
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 */
import { fileURLToPath } from 'url';
import * as path from 'path';
import * as fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface EnvironmentConfig {
  name: string;
  baseURL: string;
  timeout?: number;
}

/**
 * Get base URL for current environment
 */
export function getBaseURL(env?: string): string {
  const targetEnv = env || process.env.ARTK_ENV || 'local';

  // Try to load from artk.config.yml
  const configPath = path.join(__dirname, '..', '..', '..', 'artk.config.yml');
  if (fs.existsSync(configPath)) {
    // Dynamic import for ESM
    const yaml = await import('yaml');
    const config = yaml.parse(fs.readFileSync(configPath, 'utf8'));
    return config.environments?.[targetEnv]?.baseUrl || '${context.baseURL}';
  }

  // Fallback defaults
  const defaults: Record<string, string> = {
    local: '${context.baseURL}',
    intg: 'https://intg.example.com',
    ctlq: 'https://ctlq.example.com',
    prod: 'https://example.com',
  };

  return defaults[targetEnv] || defaults.local;
}

export function getCurrentEnv(): string {
  return process.env.ARTK_ENV || 'local';
}
`;
}
function getCjsEnvStub(context) {
  return `/**
 * CommonJS Environment Configuration Module
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 */
import * as path from 'path';
import * as fs from 'fs';

export interface EnvironmentConfig {
  name: string;
  baseURL: string;
  timeout?: number;
}

/**
 * Get base URL for current environment
 */
export function getBaseURL(env?: string): string {
  const targetEnv = env || process.env.ARTK_ENV || 'local';

  // Try to load from artk.config.yml
  const configPath = path.join(__dirname, '..', '..', '..', 'artk.config.yml');
  if (fs.existsSync(configPath)) {
    const yaml = require('yaml');
    const config = yaml.parse(fs.readFileSync(configPath, 'utf8'));
    return config.environments?.[targetEnv]?.baseUrl || '${context.baseURL}';
  }

  // Fallback defaults
  const defaults: Record<string, string> = {
    local: '${context.baseURL}',
    intg: 'https://intg.example.com',
    ctlq: 'https://ctlq.example.com',
    prod: 'https://example.com',
  };

  return defaults[targetEnv] || defaults.local;
}

export function getCurrentEnv(): string {
  return process.env.ARTK_ENV || 'local';
}
`;
}
function getEsmNavStub(context) {
  return `/**
 * ESM Navigation Module
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 */
import { fileURLToPath } from 'url';
import * as path from 'path';
import type { Page } from '@playwright/test';
import { getBaseURL } from '../config/env';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Navigate to a route
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  const baseURL = getBaseURL();
  const fullURL = route.startsWith('/') ? \`\${baseURL}\${route}\` : \`\${baseURL}/\${route}\`;
  await page.goto(fullURL);
}

/**
 * Get current route
 */
export function getCurrentRoute(page: Page): string {
  const url = new URL(page.url());
  return url.pathname;
}

/**
 * Wait for route change
 */
export async function waitForRoute(page: Page, route: string): Promise<void> {
  await page.waitForURL(\`**\${route}\`);
}
`;
}
function getCjsNavStub(context) {
  return `/**
 * CommonJS Navigation Module
 * Generated for: ${context.projectName}
 * Generated at: ${context.generatedAt}
 */
import * as path from 'path';
import type { Page } from '@playwright/test';
import { getBaseURL } from '../config/env';

/**
 * Navigate to a route
 */
export async function navigateTo(page: Page, route: string): Promise<void> {
  const baseURL = getBaseURL();
  const fullURL = route.startsWith('/') ? \`\${baseURL}\${route}\` : \`\${baseURL}/\${route}\`;
  await page.goto(fullURL);
}

/**
 * Get current route
 */
export function getCurrentRoute(page: Page): string {
  const url = new URL(page.url());
  return url.pathname;
}

/**
 * Wait for route change
 */
export async function waitForRoute(page: Page, route: string): Promise<void> {
  await page.waitForURL(\`**\${route}\`);
}
`;
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
        const path9 = error.path.join(".");
        result.errors.push(`${path9}: ${error.message}`);
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
function isInteractive() {
  return process.stdin.isTTY === true && process.stdout.isTTY === true;
}
async function promptSelect(question, options, defaultIndex = 0) {
  if (!isInteractive()) {
    return options[defaultIndex].value;
  }
  console.log(`
${question}
`);
  options.forEach((opt, index) => {
    const marker = index === defaultIndex ? "*" : " ";
    console.log(`  ${marker} ${index + 1}. ${opt.label}`);
  });
  console.log();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve6) => {
    rl.question(`Enter choice [${defaultIndex + 1}]: `, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (trimmed === "") {
        resolve6(options[defaultIndex].value);
        return;
      }
      const choice = parseInt(trimmed, 10);
      if (isNaN(choice) || choice < 1 || choice > options.length) {
        console.log(`Invalid choice, using default: ${options[defaultIndex].label}`);
        resolve6(options[defaultIndex].value);
        return;
      }
      resolve6(options[choice - 1].value);
    });
  });
}
async function promptVariant() {
  return promptSelect(
    "Select module system variant:",
    [
      { value: "commonjs", label: "CommonJS - Traditional Node.js modules (require/module.exports)" },
      { value: "esm", label: "ESM - Modern ES modules (import/export)" }
    ],
    0
    // Default to CommonJS for maximum compatibility
  );
}

// src/lib/bootstrap.ts
var __filename$1 = fileURLToPath(import.meta.url);
var __dirname$1 = path4.dirname(__filename$1);
async function bootstrap(targetPath, options = {}) {
  const logger2 = new Logger({ verbose: options.verbose });
  const errors = [];
  const resolvedPath = path4.resolve(targetPath);
  const artkE2ePath = path4.join(resolvedPath, "artk-e2e");
  const artkDir = path4.join(resolvedPath, ".artk");
  const logsDir = path4.join(artkDir, "logs");
  logger2.header("ARTK Bootstrap Installation");
  logger2.table([
    { label: "Target", value: resolvedPath },
    { label: "ARTK E2E", value: artkE2ePath }
  ]);
  if (!fs5.existsSync(resolvedPath)) {
    logger2.error(`Target directory does not exist: ${resolvedPath}`);
    return { success: false, projectPath: resolvedPath, artkE2ePath, errors: ["Target directory does not exist"] };
  }
  if (fs5.existsSync(artkE2ePath) && !options.force) {
    logger2.error("ARTK is already installed in this project. Use --force to overwrite.");
    return { success: false, projectPath: resolvedPath, artkE2ePath, errors: ["Already installed"] };
  }
  const backup = {
    configPath: null,
    configBackupPath: null,
    contextPath: null,
    contextBackupPath: null
  };
  await fs5.ensureDir(logsDir);
  try {
    if (options.force) {
      const configPath2 = path4.join(artkE2ePath, "artk.config.yml");
      if (fs5.existsSync(configPath2)) {
        backup.configPath = configPath2;
        backup.configBackupPath = `${configPath2}.bootstrap-backup`;
        await fs5.copy(configPath2, backup.configBackupPath);
        logger2.debug("Backed up existing artk.config.yml");
      }
      const contextPath = path4.join(artkDir, "context.json");
      if (fs5.existsSync(contextPath)) {
        backup.contextPath = contextPath;
        backup.contextBackupPath = `${contextPath}.bootstrap-backup`;
        await fs5.copy(contextPath, backup.contextBackupPath);
        logger2.debug("Backed up existing context.json");
      }
    }
    logger2.step(1, 7, "Detecting environment...");
    const environment = await detectEnvironment(resolvedPath);
    let variant;
    if (options.variant && options.variant !== "auto") {
      variant = options.variant;
    } else if (environment.moduleSystem !== "unknown") {
      variant = environment.moduleSystem;
    } else if (isInteractive()) {
      logger2.warning("Could not auto-detect module system");
      variant = await promptVariant();
    } else {
      variant = "commonjs";
      logger2.debug("Using CommonJS as default (non-interactive mode)");
    }
    logger2.success(`Module system: ${variant}`);
    logger2.debug(`Node.js: ${environment.nodeVersion}`);
    logger2.debug(`Platform: ${environment.platform}/${environment.arch}`);
    logger2.step(2, 7, "Creating artk-e2e/ structure...");
    await createDirectoryStructure(artkE2ePath);
    logger2.success("Directory structure created");
    logger2.step(3, 7, "Installing @artk/core to vendor/...");
    await installVendorPackages(artkE2ePath, logger2);
    logger2.success("@artk/core installed to vendor/");
    if (options.prompts !== false) {
      logger2.step(4, 7, "Installing prompts to .github/prompts/...");
      await installPrompts(resolvedPath, logger2);
      logger2.success("Prompts installed");
    } else {
      logger2.step(4, 7, "Skipping prompts installation (--no-prompts)");
    }
    logger2.step(5, 7, "Creating configuration files...");
    const projectName = path4.basename(resolvedPath);
    await createConfigurationFiles(artkE2ePath, artkDir, resolvedPath, {
      projectName,
      variant
    }, logger2);
    logger2.success("Configuration files created");
    const configPath = path4.join(artkE2ePath, "artk.config.yml");
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
      const configPath2 = path4.join(artkE2ePath, "artk.config.yml");
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
    if (backup.configBackupPath && fs5.existsSync(backup.configBackupPath)) {
      if (backup.configPath) {
        await fs5.copy(backup.configBackupPath, backup.configPath);
        await fs5.remove(backup.configBackupPath);
        logger2.debug("Restored artk.config.yml from backup");
      }
    }
    if (backup.contextBackupPath && fs5.existsSync(backup.contextBackupPath)) {
      if (backup.contextPath) {
        await fs5.copy(backup.contextBackupPath, backup.contextPath);
        await fs5.remove(backup.contextBackupPath);
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
    if (backup.configBackupPath && fs5.existsSync(backup.configBackupPath)) {
      await fs5.remove(backup.configBackupPath);
    }
    if (backup.contextBackupPath && fs5.existsSync(backup.contextBackupPath)) {
      await fs5.remove(backup.contextBackupPath);
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
    await fs5.ensureDir(path4.join(artkE2ePath, dir));
  }
}
async function installVendorPackages(artkE2ePath, logger2) {
  const assetsDir = getAssetsDir();
  const coreSource = path4.join(assetsDir, "core");
  const coreTarget = path4.join(artkE2ePath, "vendor", "artk-core");
  if (fs5.existsSync(coreSource)) {
    await fs5.copy(coreSource, coreTarget, { overwrite: true });
    logger2.debug(`Copied @artk/core from bundled assets`);
  } else {
    logger2.warning(`@artk/core assets not found at ${coreSource}`);
    await fs5.writeJson(path4.join(coreTarget, "package.json"), {
      name: "@artk/core",
      version: "1.0.0",
      main: "./dist/index.js"
    });
  }
  const autogenSource = path4.join(assetsDir, "autogen");
  const autogenTarget = path4.join(artkE2ePath, "vendor", "artk-core-autogen");
  if (fs5.existsSync(autogenSource)) {
    await fs5.copy(autogenSource, autogenTarget, { overwrite: true });
    logger2.debug(`Copied @artk/core-autogen from bundled assets`);
  } else {
    logger2.warning(`@artk/core-autogen assets not found at ${autogenSource}`);
    await fs5.writeJson(path4.join(autogenTarget, "package.json"), {
      name: "@artk/core-autogen",
      version: "0.1.0",
      main: "./dist/index.js"
    });
  }
}
async function installPrompts(projectPath, logger2) {
  const assetsDir = getAssetsDir();
  const promptsSource = path4.join(assetsDir, "prompts");
  const promptsTarget = path4.join(projectPath, ".github", "prompts");
  await fs5.ensureDir(promptsTarget);
  if (fs5.existsSync(promptsSource)) {
    const promptFiles = await fs5.readdir(promptsSource);
    let installed = 0;
    for (const file of promptFiles) {
      if (file.endsWith(".md") && file.startsWith("artk.")) {
        const source = path4.join(promptsSource, file);
        const targetName = file.replace(/\.md$/, ".prompt.md");
        const target = path4.join(promptsTarget, targetName);
        await fs5.copy(source, target, { overwrite: true });
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
  await fs5.writeJson(
    path4.join(artkE2ePath, "package.json"),
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
        "@playwright/test": "^1.57.0",
        "@types/node": "^20.10.0",
        typescript: "^5.3.0"
      }
    },
    { spaces: 2 }
  );
  await fs5.writeFile(
    path4.join(artkE2ePath, "playwright.config.ts"),
    getPlaywrightConfigTemplate()
  );
  await fs5.writeJson(
    path4.join(artkE2ePath, "tsconfig.json"),
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
  await fs5.writeFile(
    path4.join(artkE2ePath, "artk.config.yml"),
    getArtkConfigTemplate(options.projectName)
  );
  await fs5.writeFile(
    path4.join(artkE2ePath, ".gitignore"),
    `node_modules/
dist/
test-results/
playwright-report/
.auth-states/
*.local
`
  );
  const assetsDir = getAssetsDir();
  const templateContext = {
    projectName: options.projectName,
    projectRoot: projectPath,
    artkRoot: "artk-e2e",
    artkCorePath: "@artk/core",
    configPath: "config",
    authStatePath: ".auth-states",
    baseURL: "http://localhost:3000",
    generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
    moduleSystem: options.variant
  };
  const foundationResult = await generateFoundationModules(
    artkE2ePath,
    assetsDir,
    templateContext,
    logger2
  );
  if (!foundationResult.success) {
    logger2.warning("Some foundation modules failed to generate");
    for (const error of foundationResult.errors) {
      logger2.debug(`  ${error.file}: ${error.error}`);
    }
  }
  await createAdditionalModuleStubs(artkE2ePath);
  await fs5.ensureDir(artkDir);
  await fs5.writeJson(
    path4.join(artkDir, "context.json"),
    {
      version: "1.0",
      projectRoot: projectPath,
      artkRoot: artkE2ePath,
      initialized_at: (/* @__PURE__ */ new Date()).toISOString(),
      templateVariant: options.variant,
      next_suggested: "/artk.init-playbook"
    },
    { spaces: 2 }
  );
  await fs5.writeFile(
    path4.join(artkDir, ".gitignore"),
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
  const foundationPath = path4.join(artkE2ePath, "src", "modules", "foundation");
  await fs5.ensureDir(path4.join(foundationPath, "selectors"));
  await fs5.writeFile(
    path4.join(foundationPath, "selectors", "index.ts"),
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
  await fs5.ensureDir(path4.join(foundationPath, "data"));
  await fs5.writeFile(
    path4.join(foundationPath, "data", "index.ts"),
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
  await fs5.writeFile(
    path4.join(artkE2ePath, "src", "modules", "features", "index.ts"),
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
async function runNpmInstall(artkE2ePath, logsDir, logger2) {
  const logFile = path4.join(logsDir, "npm-install.log");
  return new Promise((resolve6, reject) => {
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
        fs5.writeFileSync(logFile, logLines.join("\n"));
      } catch {
      }
      if (code === 0) {
        logger2.succeedSpinner("Dependencies installed");
        resolve6();
      } else {
        logger2.failSpinner("npm install failed");
        logger2.debug(`Details saved to: ${logFile}`);
        reject(new Error(`npm install failed with code ${code}. See ${logFile} for details.`));
      }
    });
    child.on("error", (error) => {
      logLines.push(`Process error: ${error.message}`);
      try {
        fs5.writeFileSync(logFile, logLines.join("\n"));
      } catch {
      }
      logger2.failSpinner("npm install failed");
      reject(error);
    });
    setTimeout(() => {
      logLines.push("TIMEOUT: Installation took longer than 5 minutes");
      try {
        fs5.writeFileSync(logFile, logLines.join("\n"));
      } catch {
      }
      child.kill();
      logger2.failSpinner("npm install timed out");
      reject(new Error("npm install timed out"));
    }, 3e5);
  });
}
async function updateContextJson(artkDir, updates) {
  const contextPath = path4.join(artkDir, "context.json");
  let context = {};
  if (fs5.existsSync(contextPath)) {
    context = await fs5.readJson(contextPath);
  }
  Object.assign(context, updates);
  await fs5.writeJson(contextPath, context, { spaces: 2 });
}
function getAssetsDir() {
  const possiblePaths = [
    path4.join(__dirname$1, "..", "..", "assets"),
    path4.join(__dirname$1, "..", "assets"),
    path4.join(__dirname$1, "assets")
  ];
  for (const p of possiblePaths) {
    if (fs5.existsSync(p)) {
      return p;
    }
  }
  return path4.join(__dirname$1, "..", "..", "assets");
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
  return `/**
 * Playwright Configuration for ARTK E2E Tests
 *
 * Note: Uses inline config loading to avoid ESM/CommonJS resolution issues
 * with vendored @artk/core packages.
 */
import { defineConfig, devices } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// Load ARTK config from artk.config.yml
function loadArtkConfig(): Record<string, any> {
  const configPath = path.join(__dirname, 'artk.config.yml');
  if (!fs.existsSync(configPath)) {
    console.warn(\`ARTK config not found: \${configPath}, using defaults\`);
    return { environments: { local: { baseUrl: 'http://localhost:3000' } } };
  }

  const yaml = require('yaml');
  return yaml.parse(fs.readFileSync(configPath, 'utf8'));
}

const artkConfig = loadArtkConfig();
const env = process.env.ARTK_ENV || 'local';
const baseURL = artkConfig.environments?.[env]?.baseUrl || 'http://localhost:3000';
const browserChannel = artkConfig.browsers?.channel;

// Build browser use config
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
    // Auth setup project - runs first to create storage states
    {
      name: 'setup',
      testMatch: /.*\\.setup\\.ts/,
    },
    // Main browser project with auth dependency
    {
      name: 'chromium',
      use: browserUse,
      dependencies: ['setup'],
    },
    // Validation project - no auth needed
    {
      name: 'validation',
      testMatch: /foundation\\.validation\\.spec\\.ts/,
      use: browserUse,
    },
  ],
});
`;
}
function getArtkConfigTemplate(projectName) {
  return `# ARTK Configuration
# Generated by @artk/cli on ${(/* @__PURE__ */ new Date()).toISOString()}

version: "1.0"

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

// src/commands/init.ts
async function initCommand(targetPath, options) {
  const logger2 = new Logger({ verbose: options.verbose });
  let variant = "auto";
  if (options.variant) {
    if (["commonjs", "esm", "auto"].includes(options.variant)) {
      variant = options.variant;
    } else {
      logger2.error(`Invalid variant: ${options.variant}. Use: commonjs, esm, or auto`);
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
var MIN_NODE_VERSION = "18.0.0";
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
  if (semver.gte(version2, MIN_NODE_VERSION)) {
    return {
      name: "Node.js",
      status: "pass",
      version: version2,
      required: `>= ${MIN_NODE_VERSION}`,
      message: `Node.js ${version2} is installed`
    };
  }
  return {
    name: "Node.js",
    status: "fail",
    version: version2,
    required: `>= ${MIN_NODE_VERSION}`,
    message: `Node.js ${version2} is too old`,
    fix: `Upgrade to Node.js ${MIN_NODE_VERSION} or later: https://nodejs.org`
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
var __filename2 = fileURLToPath(import.meta.url);
var __dirname2 = path4.dirname(__filename2);
function getVersion() {
  try {
    const possiblePaths = [
      path4.join(__dirname2, "..", "..", "package.json"),
      path4.join(__dirname2, "..", "package.json"),
      path4.join(__dirname2, "package.json")
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
      path4.join(__dirname2, "..", "..", "assets", "core", "package.json"),
      path4.join(__dirname2, "..", "assets", "core", "package.json")
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
var __filename3 = fileURLToPath(import.meta.url);
var __dirname3 = path4.dirname(__filename3);
async function upgradeCommand(targetPath, options) {
  const logger2 = new Logger();
  const resolvedPath = path4.resolve(targetPath);
  const artkE2ePath = path4.join(resolvedPath, "artk-e2e");
  logger2.header("ARTK Upgrade");
  if (!fs5.existsSync(artkE2ePath)) {
    logger2.error("ARTK is not installed in this project.");
    logger2.info("Run: artk init <path>");
    process.exit(1);
  }
  const vendorCorePath = path4.join(artkE2ePath, "vendor", "artk-core", "package.json");
  let currentVersion = "unknown";
  if (fs5.existsSync(vendorCorePath)) {
    try {
      const pkg = await fs5.readJson(vendorCorePath);
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
    const coreSource = path4.join(assetsDir, "core");
    const coreTarget = path4.join(artkE2ePath, "vendor", "artk-core");
    if (fs5.existsSync(coreSource)) {
      await fs5.remove(coreTarget);
      await fs5.copy(coreSource, coreTarget);
    } else {
      logger2.failSpinner("Upgrade failed");
      logger2.error("Core assets not found in CLI package");
      process.exit(1);
    }
    const autogenSource = path4.join(assetsDir, "autogen");
    const autogenTarget = path4.join(artkE2ePath, "vendor", "artk-core-autogen");
    if (fs5.existsSync(autogenSource)) {
      await fs5.remove(autogenTarget);
      await fs5.copy(autogenSource, autogenTarget);
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
    path4.join(__dirname3, "..", "..", "assets"),
    path4.join(__dirname3, "..", "assets"),
    path4.join(__dirname3, "assets")
  ];
  for (const p of possiblePaths) {
    if (fs5.existsSync(p)) {
      return p;
    }
  }
  return path4.join(__dirname3, "..", "..", "assets");
}
async function doctorCommand(targetPath, options) {
  const logger2 = new Logger({ verbose: options.verbose });
  const resolvedPath = path4.resolve(targetPath);
  const artkE2ePath = path4.join(resolvedPath, "artk-e2e");
  path4.join(resolvedPath, ".artk");
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
  if (!fs5.existsSync(artkE2ePath)) {
    return {
      name: "ARTK Installation",
      status: "error",
      message: "artk-e2e directory not found"
    };
  }
  const contextPath = path4.join(projectPath, ".artk", "context.json");
  if (!fs5.existsSync(contextPath)) {
    return {
      name: "ARTK Installation",
      status: "warn",
      message: "Missing .artk/context.json",
      fix: async () => {
        await fs5.ensureDir(path4.join(projectPath, ".artk"));
        await fs5.writeJson(contextPath, {
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
  const nodeModulesPath = path4.join(artkE2ePath, "node_modules");
  if (!fs5.existsSync(nodeModulesPath)) {
    return {
      name: "Dependencies",
      status: "error",
      message: "node_modules not found",
      fix: async () => {
        execSync("npm install --legacy-peer-deps", { cwd: artkE2ePath, stdio: "pipe" });
      }
    };
  }
  const playwrightPath = path4.join(nodeModulesPath, "@playwright", "test");
  if (!fs5.existsSync(playwrightPath)) {
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
  const browsersCachePath = path4.join(projectPath, ".artk", "browsers");
  const hasCachedBrowsers = fs5.existsSync(browsersCachePath) && fs5.readdirSync(browsersCachePath).some((f) => f.startsWith("chromium-"));
  if (hasCachedBrowsers) {
    return {
      name: "Playwright Browsers",
      status: "ok",
      message: "Browsers cached in .artk/browsers/"
    };
  }
  const configPath = path4.join(artkE2ePath, "artk.config.yml");
  if (fs5.existsSync(configPath)) {
    const content = fs5.readFileSync(configPath, "utf8");
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
    if (!fs5.existsSync(path4.join(artkE2ePath, file))) {
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
  const vendorCore = path4.join(artkE2ePath, "vendor", "artk-core");
  const vendorAutogen = path4.join(artkE2ePath, "vendor", "artk-core-autogen");
  const issues = [];
  if (!fs5.existsSync(path4.join(vendorCore, "package.json"))) {
    issues.push("@artk/core");
  }
  if (!fs5.existsSync(path4.join(vendorAutogen, "package.json"))) {
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
  if (!fs5.existsSync(path4.join(artkE2ePath, "node_modules"))) {
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
  const resolvedPath = path4.resolve(targetPath);
  const artkE2ePath = path4.join(resolvedPath, "artk-e2e");
  const artkDir = path4.join(resolvedPath, ".artk");
  const promptsDir = path4.join(resolvedPath, ".github", "prompts");
  logger2.header("ARTK Uninstall");
  if (!fs5.existsSync(artkE2ePath) && !fs5.existsSync(artkDir)) {
    logger2.error("ARTK is not installed in this project.");
    process.exit(1);
  }
  logger2.info("The following will be removed:");
  logger2.blank();
  const toRemove = [];
  if (fs5.existsSync(artkE2ePath)) {
    if (options.keepTests) {
      toRemove.push({
        path: path4.join(artkE2ePath, "vendor"),
        description: "artk-e2e/vendor/ (vendored packages)"
      });
      toRemove.push({
        path: path4.join(artkE2ePath, "node_modules"),
        description: "artk-e2e/node_modules/"
      });
    } else {
      toRemove.push({
        path: artkE2ePath,
        description: "artk-e2e/ (entire directory)"
      });
    }
  }
  if (fs5.existsSync(artkDir)) {
    toRemove.push({
      path: artkDir,
      description: ".artk/ (ARTK metadata and browser cache)"
    });
  }
  if (!options.keepPrompts && fs5.existsSync(promptsDir)) {
    const artkPrompts = fs5.readdirSync(promptsDir).filter((f) => f.startsWith("artk.") && f.endsWith(".prompt.md"));
    if (artkPrompts.length > 0) {
      for (const prompt of artkPrompts) {
        toRemove.push({
          path: path4.join(promptsDir, prompt),
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
      if (fs5.existsSync(item.path)) {
        await fs5.remove(item.path);
      }
    }
    if (fs5.existsSync(promptsDir)) {
      const remaining = fs5.readdirSync(promptsDir);
      if (remaining.length === 0) {
        await fs5.remove(promptsDir);
      }
    }
    const githubDir = path4.join(resolvedPath, ".github");
    if (fs5.existsSync(githubDir)) {
      const remaining = fs5.readdirSync(githubDir);
      if (remaining.length === 0) {
        await fs5.remove(githubDir);
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
  return new Promise((resolve6) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    rl.question("Are you sure you want to uninstall? (y/N) ", (answer) => {
      rl.close();
      resolve6(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

// src/cli.ts
var version = getVersion();
program.name("artk").description("ARTK - Automatic Regression Testing Kit\n\nBootstrap Playwright test suites with AI-assisted workflows").version(version, "-v, --version", "Output the current version");
program.command("init <path>").description("Initialize ARTK in a project").option("--skip-npm", "Skip npm install").option("--skip-browsers", "Skip browser installation").option("-f, --force", "Overwrite existing installation").option("--variant <type>", "Module system: commonjs, esm, or auto (default: auto)", "auto").option("--no-prompts", "Skip installing AI prompts").option("--verbose", "Show detailed output").action(async (targetPath, options) => {
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