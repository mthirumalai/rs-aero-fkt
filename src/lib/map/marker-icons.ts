import L from "leaflet";

/**
 * Standardized marker icon configuration
 * This eliminates duplicate icon definitions across map components
 */
const ICON_CONFIG = {
  iconSize: [25, 41] as [number, number],
  iconAnchor: [12, 41] as [number, number],
  popupAnchor: [1, -34] as [number, number],
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
};

/**
 * Pre-defined marker icons for consistent styling across the app
 */
export const MARKER_ICONS = {
  start: new L.Icon({
    ...ICON_CONFIG,
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png",
  }),

  end: new L.Icon({
    ...ICON_CONFIG,
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  }),

  turningMark: new L.Icon({
    ...ICON_CONFIG,
    iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  }),

  default: new L.Icon({
    ...ICON_CONFIG,
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  }),
} as const;

/**
 * Creates a ghost marker icon (grayed out) for showing original positions
 * @param type - The type of marker (start, end, turningMark)
 * @returns A new Leaflet icon with ghost styling
 */
export function createGhostIcon(type: keyof typeof MARKER_ICONS) {
  return new L.Icon({
    ...ICON_CONFIG,
    iconUrl: MARKER_ICONS[type].options.iconUrl,
    className: 'ghost-marker',
  });
}

/**
 * Marker type definitions for type safety
 */
export type MarkerType = keyof typeof MARKER_ICONS;
export type MarkerIconType = "start" | "end" | "turning";

/**
 * Helper function to get the appropriate icon for a marker type
 * @param type - The marker type
 * @param isGhost - Whether to create a ghost version
 * @returns The appropriate Leaflet icon
 */
export function getMarkerIcon(type: MarkerType, isGhost = false): L.Icon {
  if (isGhost) {
    return createGhostIcon(type);
  }
  return MARKER_ICONS[type];
}