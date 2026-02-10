// src/variants/index.ts
function detectVariant() {
  const nodeVersionStr = process.version.slice(1);
  const nodeVersion = parseInt(nodeVersionStr.split(".")[0] ?? "18", 10);
  const isESM = typeof import.meta !== "undefined";
  if (nodeVersion >= 18) {
    return {
      id: isESM ? "modern-esm" : "modern-cjs",
      nodeVersion,
      moduleSystem: isESM ? "esm" : "cjs",
      playwrightVersion: "1.57.x",
      features: {
        ariaSnapshots: true,
        clockApi: true,
        topLevelAwait: true,
        promiseAny: true
      }
    };
  } else if (nodeVersion >= 16) {
    return {
      id: "legacy-16",
      nodeVersion,
      moduleSystem: "cjs",
      playwrightVersion: "1.49.x",
      features: {
        ariaSnapshots: true,
        clockApi: true,
        topLevelAwait: true,
        promiseAny: true
      }
    };
  } else {
    return {
      id: "legacy-14",
      nodeVersion,
      moduleSystem: "cjs",
      playwrightVersion: "1.33.x",
      features: {
        ariaSnapshots: false,
        clockApi: false,
        topLevelAwait: false,
        promiseAny: false
      }
    };
  }
}
function getFeatures() {
  return detectVariant().features;
}
function hasFeature(feature) {
  return detectVariant().features[feature];
}

export { detectVariant, getFeatures, hasFeature };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map