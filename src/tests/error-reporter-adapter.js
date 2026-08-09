import { setupErrorReporter } from '../access/error-reporter.js';

function resolveTheme() {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

const deployment = globalThis.__GHRAB_DEPLOYMENT_CONFIG__;
const studioUrl = new URL(deployment?.studioBaseUrl || '/AI-Studio-GHRAB/', globalThis.location?.origin || 'http://localhost').href;

setupErrorReporter({
  appId: 'ai-studio-reporter',
  appName: 'AI Studio GHRAB – centrální reportér',
  appVersion: '0.20.16',
  studioUrl,
  supportEmail: 'balaz@ghrabuvka.cz',
  guideUrl: deployment?.access?.guideUrl || new URL('manualy/error-report.html', studioUrl).href,
  themeResolver: resolveTheme,
});
