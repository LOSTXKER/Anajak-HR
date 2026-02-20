"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { UI_DELAYS } from "@/lib/constants";

interface UseFormSubmitOptions {
  /** Path to redirect to after a successful submission. Defaults to "/" */
  redirectTo?: string;
  /** Delay in ms before redirect. Defaults to UI_DELAYS.SUCCESS_REDIRECT (2000 ms) */
  redirectDelay?: number;
  /** Called when the submit function throws or returns a non-success result */
  onError?: (message: string) => void;
}

interface UseFormSubmitReturn {
  loading: boolean;
  error: string;
  success: boolean;
  /** Clear the error message */
  clearError: () => void;
  /**
   * Wrap an async submit handler.
   * The handler should throw (or return a rejected promise) on failure.
   * On success it should simply resolve; the hook handles the redirect.
   */
  handleSubmit: (fn: () => Promise<void>) => Promise<void>;
}

/**
 * Shared form-submission state management.
 * Eliminates the repetitive loading / error / success / redirect pattern
 * that exists in every request form page.
 *
 * Usage:
 * ```tsx
 * const { loading, error, success, handleSubmit } = useFormSubmit({ redirectTo: "/" });
 *
 * const onSubmit = (e: React.FormEvent) => {
 *   e.preventDefault();
 *   handleSubmit(async () => {
 *     // ... your async logic here; throw on failure
 *   });
 * };
 * ```
 */
export function useFormSubmit({
  redirectTo = "/",
  redirectDelay = UI_DELAYS.SUCCESS_REDIRECT,
  onError,
}: UseFormSubmitOptions = {}): UseFormSubmitReturn {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const clearError = useCallback(() => setError(""), []);

  const handleSubmit = useCallback(
    async (fn: () => Promise<void>) => {
      setLoading(true);
      setError("");
      try {
        await fn();
        setSuccess(true);
        setTimeout(() => router.push(redirectTo), redirectDelay);
      } catch (err: any) {
        const message = err?.message || "เกิดข้อผิดพลาด";
        setError(message);
        onError?.(message);
      } finally {
        setLoading(false);
      }
    },
    [router, redirectTo, redirectDelay, onError]
  );

  return { loading, error, success, clearError, handleSubmit };
}
