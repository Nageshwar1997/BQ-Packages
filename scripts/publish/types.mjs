/**
 * @import {
 *   PUBLISH_ACTIONS,
 *   VERSION_TYPES,
 * } from './constants.mjs'
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
 * @typedef {{
 *   key: string;
 *   title: string;
 *   align?: TableAlignment;
 * }} TableColumn
 */
export {};
