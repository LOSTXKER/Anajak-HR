/**
 * Global SWR Configuration
 * =============================================
 * Default settings for all SWR hooks
 */

import type { SWRConfiguration } from "swr";

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10000,
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  shouldRetryOnError: true,
  onError: (error: any) => {
    console.error("SWR Error:", error?.message || error);
  },
};
