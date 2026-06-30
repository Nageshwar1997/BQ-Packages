import { validatePublishConfig, validatePublishVersion } from '../common/validators.mjs';

/**
 * @import { PublishPackageMetadata } from '../common/types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Validates whether a package can be published.
 *
 * @param {PublishPackageMetadata} metadata
 * @returns {void}
 */
export function validatePublish(metadata) {
  validatePublishVersion(metadata);
  validatePublishConfig(metadata);
}
