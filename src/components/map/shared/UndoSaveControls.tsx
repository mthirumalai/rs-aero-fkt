import { Button } from "@/components/ui/button";

interface UndoSaveControlsProps {
  onUndo: () => void;
  onSave: () => void;
  hasChanges: boolean;
  className?: string;
}

/**
 * Reusable undo/save controls for editable map components
 * This replaces the repeated button groups found in 3+ map components
 */
export function UndoSaveControls({
  onUndo,
  onSave,
  hasChanges,
  className
}: UndoSaveControlsProps) {
  if (!hasChanges) return null;

  return (
    <div className={`absolute top-3 left-3 z-[1000] flex gap-2 ${className || ''}`}>
      <Button
        size="sm"
        variant="outline"
        onClick={onUndo}
        className="text-xs shadow-sm"
      >
        Undo
      </Button>
      <Button
        size="sm"
        onClick={onSave}
        className="text-xs shadow-sm"
      >
        Save
      </Button>
    </div>
  );
}