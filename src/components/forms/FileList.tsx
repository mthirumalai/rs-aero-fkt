import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FileListProps {
  files: File[];
  onRemove?: (index: number) => void;
  className?: string;
  showSize?: boolean;
  showRemoveButton?: boolean;
  title?: string;
}

/**
 * Reusable file list component
 * Consolidates the repeated file display patterns found across forms
 * Used in: FktSubmitForm, PhotoUploadForm, CourseSubmitFormWithGpx
 */
export function FileList({
  files,
  onRemove,
  className,
  showSize = true,
  showRemoveButton = true,
  title
}: FileListProps) {
  if (files.length === 0) return null;

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: File): string => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('text')) return '📝';
    if (file.name.toLowerCase().endsWith('.gpx')) return '🗺️';
    if (file.name.toLowerCase().endsWith('.vcc')) return '⛵';
    return '📎';
  };

  return (
    <div className={className}>
      {title && (
        <p className="text-sm text-muted-foreground mb-2">
          {title}
        </p>
      )}

      <div className="space-y-2">
        {files.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className="flex items-center justify-between bg-muted rounded-md p-2 text-sm"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-lg" role="img" aria-label="file type">
                {getFileIcon(file)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate" title={file.name}>
                  {file.name}
                </p>
                {showSize && (
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                )}
              </div>
            </div>

            {showRemoveButton && onRemove && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        {files.length} file{files.length !== 1 ? 's' : ''} selected
      </p>
    </div>
  );
}

/**
 * Simplified file list for display-only purposes
 */
export function FileListReadOnly(props: Omit<FileListProps, 'onRemove' | 'showRemoveButton'>) {
  return <FileList {...props} showRemoveButton={false} />;
}