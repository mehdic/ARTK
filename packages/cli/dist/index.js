#!/usr/bin/env node
import { createRequire } from 'module';
import { spawn, execSync } from 'child_process';
import fs4 from 'fs-extra';
import * as path3 from 'path';
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
  const resolvedPath = path3.resolve(projectPath);
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
  const packageJsonPath = path3.join(projectPath, "package.json");
  if (fs2.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs2.readFileSync(packageJsonPath, "utf8"));
      if (pkg.type === "module") {
        return "esm";
      }
      if (pkg.type === "commonjs" || !pkg.type) {
        const hasEsmConfig = fs2.existsSync(path3.join(projectPath, "tsconfig.json"));
        if (hasEsmConfig) {
          try {
            const tsconfig = JSON.parse(fs2.readFileSync(path3.join(projectPath, "tsconfig.json"), "utf8"));
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
  const srcDir = path3.join(projectPath, "src");
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
    const { execSync: execSync4 } = await import('child_process');
    const version = execSync4("npm --version", { encoding: "utf8" }).trim();
    return version;
  } catch {
    return null;
  }
}
async function detectGit(projectPath) {
  if (fs2.existsSync(path3.join(projectPath, ".git"))) {
    return true;
  }
  try {
    const { execSync: execSync4 } = await import('child_process');
    execSync4("git rev-parse --git-dir", { cwd: projectPath, encoding: "utf8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
function detectPlaywright(projectPath) {
  const playwrightPath = path3.join(projectPath, "node_modules", "@playwright", "test");
  return fs2.existsSync(playwrightPath);
}
function detectArtkCore(projectPath) {
  const vendorPath = path3.join(projectPath, "artk-e2e", "vendor", "artk-core");
  if (fs2.existsSync(vendorPath)) return true;
  const nodeModulesPath = path3.join(projectPath, "node_modules", "@artk", "core");
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
  const artkE2ePath = path3.join(targetPath, "artk-e2e");
  const browsersCachePath = path3.join(targetPath, ".artk", "browsers");
  const logsDir = options.logsDir || path3.join(targetPath, ".artk", "logs");
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
  const logFile = path3.join(logsDir, "release-cache-download.log");
  const logLines = [`Release cache download attempt - ${(/* @__PURE__ */ new Date()).toISOString()}`];
  const browsersJsonPath = path3.join(artkE2ePath, "node_modules", "playwright-core", "browsers.json");
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
    const cachedPath = path3.join(browsersCachePath, `chromium-${chromium.revision}`);
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
    const playwrightPkgPath = path3.join(artkE2ePath, "node_modules", "@playwright", "test", "package.json");
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
    const zipPath = path3.join(browsersCachePath, asset);
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
        path: path3.join(browsersCachePath, `chromium-${chromium.revision}`),
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
  return new Promise((resolve3, reject) => {
    const file = fs2.createWriteStream(destPath);
    const request = https.get(url, { timeout: timeoutMs }, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          file.close();
          fs2.unlinkSync(destPath);
          downloadFile(redirectUrl, destPath, timeoutMs).then(resolve3).catch(reject);
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
        resolve3();
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
  return new Promise((resolve3, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs2.createReadStream(filePath);
    stream.on("data", (data) => hash.update(data));
    stream.on("end", () => resolve3(hash.digest("hex").toLowerCase()));
    stream.on("error", reject);
  });
}
async function extractZip(zipPath, destDir) {
  return new Promise((resolve3, reject) => {
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
          resolve3();
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
  const logFile = path3.join(logsDir, "playwright-browser-install.log");
  return new Promise((resolve3) => {
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
        resolve3({
          channel: "bundled",
          version: null,
          path: browsersCachePath,
          strategy: "bundled-install"
        });
      } else {
        logger2.failSpinner("Failed to install Playwright browsers");
        logger2.debug(`Exit code: ${code}`);
        logger2.debug(`Details saved to: ${logFile}`);
        resolve3(null);
      }
    });
    child.on("error", (error) => {
      logLines.push(`Process error: ${error.message}`);
      writeLogFile(logFile, logLines);
      logger2.failSpinner("Failed to install Playwright browsers");
      logger2.debug(`Error: ${error.message}`);
      resolve3(null);
    });
    setTimeout(() => {
      logLines.push("TIMEOUT: Installation took longer than 5 minutes");
      writeLogFile(logFile, logLines);
      child.kill();
      logger2.failSpinner("Browser installation timed out");
      resolve3(null);
    }, 3e5);
  });
}
async function detectSystemBrowser(logsDir, logger2) {
  const logFile = path3.join(logsDir, "system-browser-detect.log");
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
      const version = await getBrowserVersion(browserPath);
      logLines.push(`    Found! Version: ${version || "unknown"}`);
      return {
        channel: browser,
        version,
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
        const path5 = error.path.join(".");
        result.errors.push(`${path5}: ${error.message}`);
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
  return new Promise((resolve3) => {
    rl.question(`Enter choice [${defaultIndex + 1}]: `, (answer) => {
      rl.close();
      const trimmed = answer.trim();
      if (trimmed === "") {
        resolve3(options[defaultIndex].value);
        return;
      }
      const choice = parseInt(trimmed, 10);
      if (isNaN(choice) || choice < 1 || choice > options.length) {
        console.log(`Invalid choice, using default: ${options[defaultIndex].label}`);
        resolve3(options[defaultIndex].value);
        return;
      }
      resolve3(options[choice - 1].value);
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
var __dirname$1 = path3.dirname(__filename$1);
async function bootstrap(targetPath, options = {}) {
  const logger2 = new Logger({ verbose: options.verbose });
  const errors = [];
  const resolvedPath = path3.resolve(targetPath);
  const artkE2ePath = path3.join(resolvedPath, "artk-e2e");
  const artkDir = path3.join(resolvedPath, ".artk");
  const logsDir = path3.join(artkDir, "logs");
  logger2.header("ARTK Bootstrap Installation");
  logger2.table([
    { label: "Target", value: resolvedPath },
    { label: "ARTK E2E", value: artkE2ePath }
  ]);
  if (!fs4.existsSync(resolvedPath)) {
    logger2.error(`Target directory does not exist: ${resolvedPath}`);
    return { success: false, projectPath: resolvedPath, artkE2ePath, errors: ["Target directory does not exist"] };
  }
  if (fs4.existsSync(artkE2ePath) && !options.force) {
    logger2.error("ARTK is already installed in this project. Use --force to overwrite.");
    return { success: false, projectPath: resolvedPath, artkE2ePath, errors: ["Already installed"] };
  }
  const backup = {
    configPath: null,
    configBackupPath: null,
    contextPath: null,
    contextBackupPath: null
  };
  await fs4.ensureDir(logsDir);
  try {
    if (options.force) {
      const configPath2 = path3.join(artkE2ePath, "artk.config.yml");
      if (fs4.existsSync(configPath2)) {
        backup.configPath = configPath2;
        backup.configBackupPath = `${configPath2}.bootstrap-backup`;
        await fs4.copy(configPath2, backup.configBackupPath);
        logger2.debug("Backed up existing artk.config.yml");
      }
      const contextPath = path3.join(artkDir, "context.json");
      if (fs4.existsSync(contextPath)) {
        backup.contextPath = contextPath;
        backup.contextBackupPath = `${contextPath}.bootstrap-backup`;
        await fs4.copy(contextPath, backup.contextBackupPath);
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
    const projectName = path3.basename(resolvedPath);
    await createConfigurationFiles(artkE2ePath, artkDir, resolvedPath, {
      projectName,
      variant
    }, logger2);
    logger2.success("Configuration files created");
    const configPath = path3.join(artkE2ePath, "artk.config.yml");
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
      const configPath2 = path3.join(artkE2ePath, "artk.config.yml");
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
    if (backup.configBackupPath && fs4.existsSync(backup.configBackupPath)) {
      if (backup.configPath) {
        await fs4.copy(backup.configBackupPath, backup.configPath);
        await fs4.remove(backup.configBackupPath);
        logger2.debug("Restored artk.config.yml from backup");
      }
    }
    if (backup.contextBackupPath && fs4.existsSync(backup.contextBackupPath)) {
      if (backup.contextPath) {
        await fs4.copy(backup.contextBackupPath, backup.contextPath);
        await fs4.remove(backup.contextBackupPath);
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
    if (backup.configBackupPath && fs4.existsSync(backup.configBackupPath)) {
      await fs4.remove(backup.configBackupPath);
    }
    if (backup.contextBackupPath && fs4.existsSync(backup.contextBackupPath)) {
      await fs4.remove(backup.contextBackupPath);
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
    await fs4.ensureDir(path3.join(artkE2ePath, dir));
  }
}
async function installVendorPackages(artkE2ePath, logger2) {
  const assetsDir = getAssetsDir();
  const coreSource = path3.join(assetsDir, "core");
  const coreTarget = path3.join(artkE2ePath, "vendor", "artk-core");
  if (fs4.existsSync(coreSource)) {
    await fs4.copy(coreSource, coreTarget, { overwrite: true });
    logger2.debug(`Copied @artk/core from bundled assets`);
  } else {
    logger2.warning(`@artk/core assets not found at ${coreSource}`);
    await fs4.writeJson(path3.join(coreTarget, "package.json"), {
      name: "@artk/core",
      version: "1.0.0",
      main: "./dist/index.js"
    });
  }
  const autogenSource = path3.join(assetsDir, "autogen");
  const autogenTarget = path3.join(artkE2ePath, "vendor", "artk-core-autogen");
  if (fs4.existsSync(autogenSource)) {
    await fs4.copy(autogenSource, autogenTarget, { overwrite: true });
    logger2.debug(`Copied @artk/core-autogen from bundled assets`);
  } else {
    logger2.warning(`@artk/core-autogen assets not found at ${autogenSource}`);
    await fs4.writeJson(path3.join(autogenTarget, "package.json"), {
      name: "@artk/core-autogen",
      version: "0.1.0",
      main: "./dist/index.js"
    });
  }
}
async function installPrompts(projectPath, logger2) {
  const assetsDir = getAssetsDir();
  const promptsSource = path3.join(assetsDir, "prompts");
  const promptsTarget = path3.join(projectPath, ".github", "prompts");
  await fs4.ensureDir(promptsTarget);
  if (fs4.existsSync(promptsSource)) {
    const promptFiles = await fs4.readdir(promptsSource);
    let installed = 0;
    for (const file of promptFiles) {
      if (file.endsWith(".md") && file.startsWith("artk.")) {
        const source = path3.join(promptsSource, file);
        const targetName = file.replace(/\.md$/, ".prompt.md");
        const target = path3.join(promptsTarget, targetName);
        await fs4.copy(source, target, { overwrite: true });
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
  await fs4.writeJson(
    path3.join(artkE2ePath, "package.json"),
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
  await fs4.writeFile(
    path3.join(artkE2ePath, "playwright.config.ts"),
    getPlaywrightConfigTemplate()
  );
  await fs4.writeJson(
    path3.join(artkE2ePath, "tsconfig.json"),
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
  await fs4.writeFile(
    path3.join(artkE2ePath, "artk.config.yml"),
    getArtkConfigTemplate(options.projectName)
  );
  await fs4.writeFile(
    path3.join(artkE2ePath, ".gitignore"),
    `node_modules/
dist/
test-results/
playwright-report/
.auth-states/
*.local
`
  );
  const coreGeneratorPath = path3.join(artkE2ePath, "vendor", "artk-core", "scripts", "generate-foundation.ts");
  if (fs4.existsSync(coreGeneratorPath)) {
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
  await fs4.ensureDir(artkDir);
  await fs4.writeJson(
    path3.join(artkDir, "context.json"),
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
  await fs4.writeFile(
    path3.join(artkDir, ".gitignore"),
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
  const foundationPath = path3.join(artkE2ePath, "src", "modules", "foundation");
  await fs4.ensureDir(path3.join(foundationPath, "selectors"));
  await fs4.writeFile(
    path3.join(foundationPath, "selectors", "index.ts"),
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
  await fs4.ensureDir(path3.join(foundationPath, "data"));
  await fs4.writeFile(
    path3.join(foundationPath, "data", "index.ts"),
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
  await fs4.writeFile(
    path3.join(artkE2ePath, "src", "modules", "features", "index.ts"),
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
  const logFile = path3.join(logsDir, "npm-install.log");
  return new Promise((resolve3, reject) => {
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
        fs4.writeFileSync(logFile, logLines.join("\n"));
      } catch {
      }
      if (code === 0) {
        logger2.succeedSpinner("Dependencies installed");
        resolve3();
      } else {
        logger2.failSpinner("npm install failed");
        logger2.debug(`Details saved to: ${logFile}`);
        reject(new Error(`npm install failed with code ${code}. See ${logFile} for details.`));
      }
    });
    child.on("error", (error) => {
      logLines.push(`Process error: ${error.message}`);
      try {
        fs4.writeFileSync(logFile, logLines.join("\n"));
      } catch {
      }
      logger2.failSpinner("npm install failed");
      reject(error);
    });
    setTimeout(() => {
      logLines.push("TIMEOUT: Installation took longer than 5 minutes");
      try {
        fs4.writeFileSync(logFile, logLines.join("\n"));
      } catch {
      }
      child.kill();
      logger2.failSpinner("npm install timed out");
      reject(new Error("npm install timed out"));
    }, 3e5);
  });
}
async function updateContextJson(artkDir, updates) {
  const contextPath = path3.join(artkDir, "context.json");
  let context = {};
  if (fs4.existsSync(contextPath)) {
    context = await fs4.readJson(contextPath);
  }
  Object.assign(context, updates);
  await fs4.writeJson(contextPath, context, { spaces: 2 });
}
function getAssetsDir() {
  const possiblePaths = [
    path3.join(__dirname$1, "..", "..", "assets"),
    path3.join(__dirname$1, "..", "assets"),
    path3.join(__dirname$1, "assets")
  ];
  for (const p of possiblePaths) {
    if (fs4.existsSync(p)) {
      return p;
    }
  }
  return path3.join(__dirname$1, "..", "..", "assets");
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
  const version = process.version.replace(/^v/, "");
  if (semver.gte(version, MIN_NODE_VERSION)) {
    return {
      name: "Node.js",
      status: "pass",
      version,
      required: `>= ${MIN_NODE_VERSION}`,
      message: `Node.js ${version} is installed`
    };
  }
  return {
    name: "Node.js",
    status: "fail",
    version,
    required: `>= ${MIN_NODE_VERSION}`,
    message: `Node.js ${version} is too old`,
    fix: `Upgrade to Node.js ${MIN_NODE_VERSION} or later: https://nodejs.org`
  };
}
function checkNpmVersion() {
  try {
    const version = execSync("npm --version", { encoding: "utf8" }).trim();
    if (semver.gte(version, MIN_NPM_VERSION)) {
      return {
        name: "npm",
        status: "pass",
        version,
        required: `>= ${MIN_NPM_VERSION}`,
        message: `npm ${version} is installed`
      };
    }
    return {
      name: "npm",
      status: "fail",
      version,
      required: `>= ${MIN_NPM_VERSION}`,
      message: `npm ${version} is too old`,
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
    const version = execSync("git --version", { encoding: "utf8" }).trim();
    const match = version.match(/(\d+\.\d+\.\d+)/);
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
var __filename2 = fileURLToPath(import.meta.url);
var __dirname2 = path3.dirname(__filename2);
function getVersion() {
  try {
    const possiblePaths = [
      path3.join(__dirname2, "..", "..", "package.json"),
      path3.join(__dirname2, "..", "package.json"),
      path3.join(__dirname2, "package.json")
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

export { bootstrap, checkPrerequisites, detectEnvironment, getVersion, resolveBrowser };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map