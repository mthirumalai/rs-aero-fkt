import { useState, useCallback } from "react";

export interface FormStateOptions {
  initialData?: Record<string, any>;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface FormState<T = Record<string, any>> {
  // State
  loading: boolean;
  error: string | null;
  success: boolean;
  data: T;

  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSuccess: (success: boolean) => void;
  updateField: <K extends keyof T>(field: K, value: T[K]) => void;
  updateData: (newData: Partial<T>) => void;
  resetForm: () => void;
  clearError: () => void;

  // Async helpers
  executeAsync: <R>(asyncFn: () => Promise<R>) => Promise<R | null>;
}

/**
 * Reusable form state management hook
 * Consolidates the repeated pattern of loading/error/success state + form data
 * Used across 7+ forms in the application
 */
export function useFormState<T extends Record<string, any>>(
  initialData: T,
  options: FormStateOptions = {}
): FormState<T> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [data, setData] = useState<T>({ ...initialData, ...options.initialData });

  const updateField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  }, [error]);

  const updateData = useCallback((newData: Partial<T>) => {
    setData(prev => ({ ...prev, ...newData }));
  }, []);

  const resetForm = useCallback(() => {
    setData({ ...initialData, ...options.initialData });
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, [initialData, options.initialData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const executeAsync = useCallback(async <R>(asyncFn: () => Promise<R>): Promise<R | null> => {
    try {
      setLoading(true);
      setError(null);

      const result = await asyncFn();

      setSuccess(true);
      setLoading(false);

      if (options.onSuccess) {
        options.onSuccess();
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setLoading(false);
      setSuccess(false);

      if (options.onError) {
        options.onError(errorMessage);
      }

      return null;
    }
  }, [options]);

  return {
    // State
    loading,
    error,
    success,
    data,

    // Actions
    setLoading,
    setError,
    setSuccess,
    updateField,
    updateData,
    resetForm,
    clearError,
    executeAsync,
  };
}