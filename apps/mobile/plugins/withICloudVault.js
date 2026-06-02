const { withEntitlementsPlist, withInfoPlist } = require('@expo/config-plugins');

/**
 * Declares the iCloud Documents container `iCloud.my.lucidity` so the markdown
 * vault syncs via iCloud and appears as a "Lucidity" folder in the Files app on
 * both Mac and iPhone. Adds the iCloud entitlements + the NSUbiquitousContainers
 * Info.plist key (document scope public, nested folders allowed).
 *
 * NOT WIRED IN YET. Enable only once the paid Apple Developer membership is
 * active and the container is registered (free personal teams cannot sign
 * iCloud). To turn on (the #174 spike / #175 step):
 *   1. add  './plugins/withICloudVault'  to the `plugins` array in app.config.ts
 *   2. REMOVE  './plugins/withFreeTeamSigning'  at the same time — it strips
 *      App Groups / push, and a paid team signs those (and iCloud) for real
 *   3. `expo prebuild --clean` then a native rebuild
 *
 * If the entitlement is rejected at signing, the provisioning profile's iCloud
 * environment may need `com.apple.developer.icloud-container-environment`
 * ('Development' | 'Production') — add it to the entitlements below. EAS/managed
 * prebuild usually derives it from the profile, so it's left unset here.
 */
const ICLOUD_CONTAINER = 'iCloud.my.lucidity';
const CONTAINER_DISPLAY_NAME = 'Lucidity';

const withICloudEntitlements = (config) =>
  withEntitlementsPlist(config, (config) => {
    const entitlements = config.modResults;
    entitlements['com.apple.developer.icloud-container-identifiers'] = [ICLOUD_CONTAINER];
    entitlements['com.apple.developer.ubiquity-container-identifiers'] = [ICLOUD_CONTAINER];
    entitlements['com.apple.developer.icloud-services'] = ['CloudDocuments'];
    return config;
  });

const withICloudContainerVisibleInFiles = (config) =>
  withInfoPlist(config, (config) => {
    config.modResults.NSUbiquitousContainers = {
      ...(config.modResults.NSUbiquitousContainers || {}),
      [ICLOUD_CONTAINER]: {
        NSUbiquitousContainerIsDocumentScopePublic: true,
        NSUbiquitousContainerName: CONTAINER_DISPLAY_NAME,
        NSUbiquitousContainerSupportedFolderLevels: 'Any',
      },
    };
    return config;
  });

const withICloudVault = (config) =>
  withICloudContainerVisibleInFiles(withICloudEntitlements(config));

module.exports = withICloudVault;
