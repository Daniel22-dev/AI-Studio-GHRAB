import {
  deploymentUrls,
  loadDeploymentConfig,
} from '../access/deployment-config.js';

const deployment = await loadDeploymentConfig({ appId: 'ai-studio' });
const urls = deploymentUrls(deployment);
const { protectApp } = await import(urls.guardUrl);

await protectApp('ai-studio-reporter', {
  studioUrl: urls.studioUrl,
  errorReporter: false,
});
await import('./error-reporter-adapter.js');
