/**
 * Constants for GPX track validation and visualization
 */

/**
 * The tolerance radius in meters for validating if a track point
 * passes sufficiently close to a route marker (start, finish, turning mark).
 * This is used for:
 * - GPX validation during FKT attempt submission
 * - Visual circles drawn around route markers on maps
 */
export const VALIDATION_TOLERANCE_METERS = 10;