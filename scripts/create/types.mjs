import { PACKAGE_TEMPLATES } from './constants.mjs';
/**
 * Package template.
 *
 * @typedef {typeof PACKAGE_TEMPLATES[keyof typeof PACKAGE_TEMPLATES]} PackageTemplate
 */

/**
 * Package configuration files.
 *
 * @typedef {object} PackageConfig
 * @property {string} tsconfig
 * @property {string} eslint
 * @property {string} tsup
 */

/**
 * Package template configuration.
 *
 * @typedef {object} PackageTemplateConfig
 * @property {string} directory
 * @property {PackageTemplate} packagePrefix
 * @property {PackageConfig} config
 */

/**
 * Parameters required to build package metadata.
 *
 * @typedef {object} BuildPackageMetadataOptions
 * @property {PackageTemplate} template
 * @property {string} packageName
 * @property {string} description
 * @property {string[]} keywords
 * @property {PackageTemplateConfig} templateConfig
 */

/**
 * Create Package metadata.
 *
 * @typedef {object} CreatePackageMetadata
 * @property {PackageTemplate} template
 * @property {string} packageName
 * @property {string} scopedPackageName
 * @property {string} packageDirectory
 * @property {string} description
 * @property {string[]} keywords
 * @property {PackageTemplate} packagePrefix
 * @property {string} directory
 * @property {PackageConfig} config
 */
