"use client";

import { useEffect } from "react";
import {
  getNotificationSettings,
  scheduleDailyNotifications,
  canShowNotifications,
} from "@/lib/utils/notifications";

/**
 * Component that initializes notification scheduling when the app loads.
 * This should be mounted in the root layout or main app component.
 */
export function NotificationInitializer() {
  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    // Load settings and schedule if enabled
    const settings = getNotificationSettings();

    if (settings.enabled && canShowNotifications()) {
      // Small delay to ensure everything is ready
      const timer = setTimeout(() => {
        scheduleDailyNotifications(settings);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  // This component doesn't render anything
  return null;
}

