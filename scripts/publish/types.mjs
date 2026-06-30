/**
 * @import {
 *   PUBLISH_ACTIONS,
 *   VERSION_TYPES,
 * } from './constants.mjs'
 */

/**
 * @import {
 *   DEPENDENCY_SCOPES,
 *   DEPENDENCY_TYPES,
 *   PACKAGE_STATUS_MAP,
 *   TABLE_ALIGNMENTS,
 * } from '../common/constants.mjs'
 */

/* -------------------------------------------------------------------------- */
/*                               DEPENDENCIES                                 */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {{
 *   name: string;
 *   version: string;
 *   type: (typeof DEPENDENCY_TYPES)[keyof typeof DEPENDENCY_TYPES];
 *   scope: (typeof DEPENDENCY_SCOPES)[keyof typeof DEPENDENCY_SCOPES];
 * }} Dependency
 */

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

/**
 * @typedef {(typeof VERSION_TYPES)[keyof typeof VERSION_TYPES]} VersionType
 */

/**
 * @typedef {(typeof PUBLISH_ACTIONS)[keyof typeof PUBLISH_ACTIONS]} PublishAction
 */

/**
 * @typedef {(typeof TABLE_ALIGNMENTS)[keyof typeof TABLE_ALIGNMENTS]} TableAlignment
 */

/**
 * @typedef {{
 *   key: string;
 *   title: string;
 *   align?: TableAlignment;
 * }} TableColumn
 */
export {};
