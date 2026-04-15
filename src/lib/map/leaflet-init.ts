import L from "leaflet";

/**
 * Initializes Leaflet with default icon configuration
 * This replaces the repeated initialization code found in every map component
 */
export function initializeLeaflet() {
  // Fix for default markers not showing in Next.js
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

/**
 * Initialize Leaflet when a component mounts
 * Use this hook in map components instead of repeating the initialization code
 */
export function useLeafletInit() {
  const isInitialized = typeof window !== "undefined" && L.Icon.Default.prototype.options;

  if (!isInitialized) {
    initializeLeaflet();
  }
}