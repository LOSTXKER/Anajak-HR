/**
 * Notification Utilities for PWA
 * Handle Web Push Notifications for check-in/check-out reminders
 */

export interface NotificationSettings {
  enabled: boolean;
  checkinReminder: boolean;
  checkinTime: string; // "08:00"
  checkoutReminder: boolean;
  checkoutTime: string; // "17:00"
  workdaysOnly: boolean;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Check if notifications are supported and permitted
 */
export function canShowNotifications(): boolean {
  return (
    'Notification' in window && 
    Notification.permission === 'granted'
  );
}

/**
 * Show a notification
 */
export function showNotification(
  title: string,
  options?: NotificationOptions
): void {
  if (!canShowNotifications()) {
    console.warn('Cannot show notification: permission not granted');
    return;
  }

  try {
    // Use Service Worker notification if available (better for PWA)
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          ...options,
        });
      });
    } else {
      // Fallback to regular notification
      new Notification(title, {
        icon: '/icons/icon-192x192.png',
        ...options,
      });
    }
  } catch (error) {
    console.error('Error showing notification:', error);
  }
}

/**
 * Show check-in reminder notification
 */
export function showCheckinReminder(): void {
  showNotification('⏰ ถึงเวลาเช็คอิน', {
    body: 'อย่าลืมเช็คอินเวลาเข้างานนะครับ',
    tag: 'checkin-reminder',
    requireInteraction: true,
  });
}

/**
 * Show check-out reminder notification
 */
export function showCheckoutReminder(): void {
  showNotification('🏠 ถึงเวลาเช็คเอาท์', {
    body: 'อย่าลืมเช็คเอาท์ก่อนกลับบ้านนะครับ',
    tag: 'checkout-reminder',
    requireInteraction: true,
  });
}

/**
 * Schedule daily notifications based on settings
 */
export function scheduleDailyNotifications(settings: NotificationSettings): void {
  if (!settings.enabled || !canShowNotifications()) {
    return;
  }

  const now = new Date();
  
  // Schedule check-in reminder
  if (settings.checkinReminder) {
    const [hour, minute] = settings.checkinTime.split(':').map(Number);
    const checkinTime = new Date();
    checkinTime.setHours(hour, minute, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (checkinTime <= now) {
      checkinTime.setDate(checkinTime.getDate() + 1);
    }
    
    // Skip weekends if workdaysOnly
    if (settings.workdaysOnly) {
      while (checkinTime.getDay() === 0 || checkinTime.getDay() === 6) {
        checkinTime.setDate(checkinTime.getDate() + 1);
      }
    }
    
    const timeUntilCheckin = checkinTime.getTime() - now.getTime();
    setTimeout(() => {
      showCheckinReminder();
      // Reschedule for next day
      scheduleDailyNotifications(settings);
    }, timeUntilCheckin);
    
    console.debug(`Check-in reminder scheduled for: ${checkinTime.toLocaleString('th-TH')}`);
  }
  
  // Schedule check-out reminder
  if (settings.checkoutReminder) {
    const [hour, minute] = settings.checkoutTime.split(':').map(Number);
    const checkoutTime = new Date();
    checkoutTime.setHours(hour, minute, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (checkoutTime <= now) {
      checkoutTime.setDate(checkoutTime.getDate() + 1);
    }
    
    // Skip weekends if workdaysOnly
    if (settings.workdaysOnly) {
      while (checkoutTime.getDay() === 0 || checkoutTime.getDay() === 6) {
        checkoutTime.setDate(checkoutTime.getDate() + 1);
      }
    }
    
    const timeUntilCheckout = checkoutTime.getTime() - now.getTime();
    setTimeout(() => {
      showCheckoutReminder();
      // Reschedule for next day
      scheduleDailyNotifications(settings);
    }, timeUntilCheckout);
    
    console.debug(`Check-out reminder scheduled for: ${checkoutTime.toLocaleString('th-TH')}`);
  }
}

/**
 * Get notification settings from localStorage (with DB defaults)
 */
export async function getNotificationSettingsAsync(): Promise<NotificationSettings> {
  if (typeof window === 'undefined') {
    return getDefaultNotificationSettings();
  }
  
  try {
    const stored = localStorage.getItem('notification_settings');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading notification settings:', error);
  }
  
  // If no stored settings, get defaults from DB
  return await getDefaultNotificationSettingsFromDB();
}

/**
 * Get notification settings from localStorage (sync version)
 */
export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') {
    return getDefaultNotificationSettings();
  }
  
  try {
    const stored = localStorage.getItem('notification_settings');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading notification settings:', error);
  }
  
  return getDefaultNotificationSettings();
}

/**
 * Save notification settings to localStorage
 */
export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem('notification_settings', JSON.stringify(settings));
    
    // Reschedule notifications with new settings
    scheduleDailyNotifications(settings);
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
}

/**
 * Get default notification settings from system settings
 * Uses work_start_time and work_end_time for notification times
 */
export async function getDefaultNotificationSettingsFromDB(): Promise<NotificationSettings> {
  if (typeof window === 'undefined') {
    return getDefaultNotificationSettings();
  }

  try {
    // Dynamic import to avoid issues
    const { supabase } = await import('@/lib/supabase/client');
    
    // Get work start/end times from system settings
    const { data } = await supabase
      .from('system_settings')
      .select('*')
      .in('setting_key', ['work_start_time', 'work_end_time']);

    if (data && data.length > 0) {
      const map: any = {};
      data.forEach((item: any) => {
        map[item.setting_key] = item.setting_value;
      });

      return {
        enabled: false,
        checkinReminder: true,
        checkinTime: map.work_start_time || '08:30',
        checkoutReminder: true,
        checkoutTime: map.work_end_time || '17:30',
        workdaysOnly: true, // Always check holidays from database
      };
    }
  } catch (error) {
    console.error('Error loading default settings from DB:', error);
  }

  return getDefaultNotificationSettings();
}

/**
 * Get default notification settings (fallback)
 */
export function getDefaultNotificationSettings(): NotificationSettings {
  return {
    enabled: false,
    checkinReminder: true,
    checkinTime: '08:30',
    checkoutReminder: true,
    checkoutTime: '17:30',
    workdaysOnly: true, // Always check holidays
  };
}

/**
 * Test notification (for settings page)
 */
export function testNotification(): void {
  showNotification('🔔 ทดสอบการแจ้งเตือน', {
    body: 'การแจ้งเตือนทำงานปกติ',
    tag: 'test-notification',
  });
}




