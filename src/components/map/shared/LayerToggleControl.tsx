interface LayerToggleControlProps {
  marine: boolean;
  onToggle: (marine: boolean) => void;
  className?: string;
}

/**
 * Reusable map layer toggle control for switching between Street and Marine views
 * This replaces the repeated toggle button UI found in 4+ map components
 */
export function LayerToggleControl({ marine, onToggle, className }: LayerToggleControlProps) {
  return (
    <div className={`absolute top-3 right-3 z-[1000] flex rounded overflow-hidden border border-gray-300 shadow-sm text-xs font-medium ${className || ''}`}>
      <button
        onClick={() => onToggle(false)}
        className={`px-3 py-1.5 transition-colors ${
          !marine
            ? "bg-primary text-white"
            : "bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        Street
      </button>
      <button
        onClick={() => onToggle(true)}
        className={`px-3 py-1.5 transition-colors ${
          marine
            ? "bg-primary text-white"
            : "bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        Marine
      </button>
    </div>
  );
}