import { TileLayer } from "react-leaflet";

interface StandardTileLayersProps {
  marineOpacity?: number;
}

/**
 * Reusable tile layer configuration for all maps
 * This standardizes the OpenStreetMap base layer and OpenSeaMap overlay
 * across all map components
 */
export function StandardTileLayers({ marineOpacity = 1 }: StandardTileLayersProps) {
  return (
    <>
      {/* OpenStreetMap base layer */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* OpenSeaMap marine overlay */}
      <TileLayer
        attribution='&copy; <a href="https://www.openseamap.org">OpenSeaMap</a> contributors'
        url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
        opacity={marineOpacity}
      />
    </>
  );
}