import { useState, useCallback } from "react";

export interface FileUploadOptions {
  onProgress?: (progress: string) => void;
  onSuccess?: (uploadedFiles: UploadedFile[]) => void;
  onError?: (error: string) => void;
  maxFileSize?: number; // in bytes
  allowedFileTypes?: string[];
}

export interface UploadedFile {
  file: File;
  url: string;
  key: string;
}

export interface FileUploadState {
  uploading: boolean;
  uploadProgress: string | null;
  uploadedFiles: UploadedFile[];
  error: string | null;

  uploadFiles: (files: FileList | File[]) => Promise<UploadedFile[]>;
  uploadSingleFile: (file: File) => Promise<UploadedFile | null>;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  clearError: () => void;
}

/**
 * Reusable file upload hook with S3 presigned URLs
 * Consolidates the upload logic repeated across FktSubmitForm, PhotoUploadForm, ContactForm
 */
export function useFileUpload(options: FileUploadOptions = {}): FileUploadState {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const {
    onProgress,
    onSuccess,
    onError,
    maxFileSize = 10 * 1024 * 1024, // 10MB default
    allowedFileTypes = []
  } = options;

  const validateFile = useCallback((file: File): string | null => {
    if (maxFileSize && file.size > maxFileSize) {
      return `File "${file.name}" is too large. Maximum size is ${Math.round(maxFileSize / 1024 / 1024)}MB.`;
    }

    if (allowedFileTypes.length > 0) {
      const fileExtension = file.name.toLowerCase().split('.').pop();
      const mimeTypeMatch = allowedFileTypes.some(type =>
        file.type.toLowerCase().includes(type.toLowerCase()) ||
        (fileExtension && type.toLowerCase().includes(fileExtension))
      );

      if (!mimeTypeMatch) {
        return `File "${file.name}" type not allowed. Allowed types: ${allowedFileTypes.join(', ')}`;
      }
    }

    return null;
  }, [maxFileSize, allowedFileTypes]);

  const uploadSingleFile = useCallback(async (file: File): Promise<UploadedFile | null> => {
    // Validate file
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (onError) onError(validationError);
      return null;
    }

    try {
      const progressMessage = `Uploading ${file.name}...`;
      setUploadProgress(progressMessage);
      if (onProgress) onProgress(progressMessage);

      // Get presigned URL
      const uploadUrlResponse = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.text();
        throw new Error(`Failed to get upload URL: ${errorData}`);
      }

      const { uploadUrl, key } = await uploadUrlResponse.json();

      // Upload file to S3
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file: ${uploadResponse.statusText}`);
      }

      const uploadedFile: UploadedFile = {
        file,
        url: uploadUrl.split('?')[0], // Remove query params to get the file URL
        key
      };

      setUploadProgress(`${file.name} uploaded successfully`);
      if (onProgress) onProgress(`${file.name} uploaded successfully`);

      return uploadedFile;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      if (onError) onError(errorMessage);
      return null;
    }
  }, [validateFile, onProgress, onError]);

  const uploadFiles = useCallback(async (files: FileList | File[]): Promise<UploadedFile[]> => {
    setUploading(true);
    setError(null);

    const fileArray = Array.from(files);
    const uploadPromises = fileArray.map(file => uploadSingleFile(file));

    try {
      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter((result): result is UploadedFile => result !== null);

      setUploadedFiles(prev => [...prev, ...successfulUploads]);
      setUploadProgress(null);
      setUploading(false);

      if (onSuccess) {
        onSuccess(successfulUploads);
      }

      return successfulUploads;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      setUploadProgress(null);
      setUploading(false);

      if (onError) onError(errorMessage);
      return [];
    }
  }, [uploadSingleFile, onSuccess, onError]);

  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearFiles = useCallback(() => {
    setUploadedFiles([]);
    setUploadProgress(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    uploading,
    uploadProgress,
    uploadedFiles,
    error,
    uploadFiles,
    uploadSingleFile,
    removeFile,
    clearFiles,
    clearError,
  };
}