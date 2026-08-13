(function (g) {
  'use strict';
  g.GHRAB_PLATFORM_CONFIG = Object.freeze(
{
  "schema": "ghrab-platform-app-config-v1",
  "appId": "ai-studio",
  "appName": "AI Studio GHRAB",
  "appVersion": "0.21.27",
  "requiredPlatformRange": ">=1.1.0 <2.0.0",
  "autoFooter": false,
  "bridgeWriteLegacy": true,
  "bridgeMaxBytes": 500000,
  "theme": {
    "contract": "ghrab-theme-v1",
    "supported": [
      "light",
      "dark"
    ],
    "default": "dark"
  },
  "storageMigration": {
    "id": "p2-storage-namespace-v1",
    "backup": "full",
    "mappings": [
      {
        "legacy": "ghrab.language",
        "canonical": "ghrab.ai-studio.language.v1"
      },
      {
        "legacy": "ghrab.motion",
        "canonical": "ghrab.ai-studio.motion.v1"
      },
      {
        "legacy": "ghrab.workspace.v1",
        "canonical": "ghrab.ai-studio.workspace.v1"
      }
    ]
  },
  "quality": {
    "schema": "ghrab-quality-consumer-v1",
    "accessibilityContract": "ghrab-a11y-v1",
    "performanceContract": "ghrab-performance-v1",
    "moduleContract": "ghrab-lazy-modules-v1",
    "requireBudget": true,
    "performanceBudget": {
      "distBytes": 2250000,
      "entryHtmlBytes": 50000,
      "entryCriticalBytes": 500000,
      "largestInlineScriptBytes": 30000,
      "precacheBytes": 1800000,
      "largestFileBytes": 200000,
      "duplicateLargeBytes": 260000
    },
    "modules": {
      "required": [
        "modules/portal-effects.js",
        "modules/registry-client.js"
      ]
    },
    "referenceProfile": {
      "cpuSlowdown": 4,
      "viewport": "1366x768",
      "memoryClassGb": 4,
      "viewportWidths": [
        1280,
        390,
        320
      ]
    },
    "stage": "P3",
    "a11yContract": "ghrab-a11y-v1",
    "requireRuntimeBudget": true,
    "runtimeBudget": {
      "maxDomNodes": 1000,
      "maxRenderReadyMs": 2000,
      "maxJsHeapUsedBytes": 8000000,
      "maxLayoutDurationMs": 1200,
      "maxTaskDurationMs": 1800
    }
  }
}
  );
})(window);
