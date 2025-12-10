/**
 * Settings Hooks
 * =============================================
 * SWR hooks for fetching system settings
 */

import useSWR from "swr";
import {
    getSystemSettings,
    getWorkSettings,
    getOTSettings,
} from "@/lib/services/settings.service";
import type { AllSettings, WorkSettings, OTSettings } from "@/lib/types";

// Fetcher functions for SWR
const fetchAllSettings = async (): Promise<AllSettings> => {
    return getSystemSettings();
};

const fetchWorkSettings = async (): Promise<WorkSettings> => {
    return getWorkSettings();
};

const fetchOTSettings = async (): Promise<OTSettings> => {
    return getOTSettings();
};

/**
 * Hook to get all system settings
 */
export function useSettings() {
    const { data, error, isLoading, mutate } = useSWR(
        "settings:all",
        fetchAllSettings,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000, // 1 minute
        }
    );

    return {
        settings: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

/**
 * Hook to get work-related settings
 */
export function useWorkSettings() {
    const { data, error, isLoading, mutate } = useSWR(
        "settings:work",
        fetchWorkSettings,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        settings: data,
        isLoading,
        error,
        refetch: mutate,
    };
}

/**
 * Hook to get OT-related settings
 */
export function useOTSettings() {
    const { data, error, isLoading, mutate } = useSWR(
        "settings:ot",
        fetchOTSettings,
        {
            revalidateOnFocus: false,
            dedupingInterval: 60000,
        }
    );

    return {
        settings: data,
        isLoading,
        error,
        refetch: mutate,
    };
}
