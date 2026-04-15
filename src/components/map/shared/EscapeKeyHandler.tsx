import { useMapEvents } from "react-leaflet";

interface EscapeKeyHandlerProps {
  onEscape: () => void;
}

/**
 * Reusable component for handling escape key events on maps
 * This replaces the repeated EscapeKeyHandler component found in editable map components
 */
export function EscapeKeyHandler({ onEscape }: EscapeKeyHandlerProps) {
  useMapEvents({
    keydown: (e) => {
      if (e.originalEvent.key === 'Escape') {
        onEscape();
      }
    }
  });

  return null;
}