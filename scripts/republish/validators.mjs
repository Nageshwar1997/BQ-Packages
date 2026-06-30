import { PublishError } from '../common/errors.mjs';
import { validatePublishConfig, validatePublishVersion } from '../common/validators.mjs';

/**
 * @import { PublishPackageMetadata, } from '../common/types.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                               PUBLIC API                                   */
/* -------------------------------------------------------------------------- */

/**
 * Validates whether a package can be republished.
 *
 * @param {PublishPackageMetadata} metadata
 * @returns {void}
 */
export function validateRepublish(metadata) {
  if (!metadata.published) {
    throw new PublishError(`"${metadata.npmPackageName}" has not been published yet.`);
  }
  validatePublishVersion(metadata);
  validatePublishConfig(metadata);
}
