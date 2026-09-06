import {
  deploymentUrls,
  loadDeploymentConfig,
} from '../access/deployment-config.js?v=0.21.44';

const deployment = await loadDeploymentConfig({ appId: 'ai-studio' });
const urls = deploymentUrls(deployment);
const { protectApp } = await import(urls.guardUrl);

await protectApp('ai-studio-manual', {
  studioUrl: urls.studioUrl,
  errorReporter: false,
});
