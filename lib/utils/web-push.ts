/**
 * Web Push Notifications Utilities
 * Using Web Push API for persistent notifications
 */

// VAPID public key - ต้องสร้างจาก backend
// ตอนนี้ใช้ค่า placeholder ก่อน Admin ต้องไปสร้าง VAPID keys ที่หน้า settings
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      return null;
    }

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission denied');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push notifications
      const vapidPublicKey = VAPID_PUBLIC_KEY;
      
      if (!vapidPublicKey) {
        console.error('VAPID public key not configured');
        return null;
      }

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as BufferSource,
      });

      console.log('Push notification subscription created:', subscription);

      // Send subscription to backend
      await sendSubscriptionToBackend(subscription);
    }

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      
      // Remove subscription from backend
      await removeSubscriptionFromBackend(subscription);
      
      console.log('Unsubscribed from push notifications');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    return subscription !== null;
  } catch (error) {
    console.error('Error checking push subscription:', error);
    return false;
  }
}

/**
 * Send subscription to backend
 */
async function sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
  try {
    // Get employee ID from auth
    const { supabase } = await import('@/lib/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        employeeId: user.id, // Send employee ID
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to backend');
    }

    console.log('Subscription sent to backend successfully');
  } catch (error) {
    console.error('Error sending subscription to backend:', error);
  }
}

/**
 * Remove subscription from backend
 */
async function removeSubscriptionFromBackend(subscription: PushSubscription): Promise<void> {
  try {
    // Get employee ID from auth
    const { supabase } = await import('@/lib/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        employeeId: user.id, // Send employee ID
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to remove subscription from backend');
    }

    console.log('Subscription removed from backend successfully');
  } catch (error) {
    console.error('Error removing subscription from backend:', error);
  }
}

/**
 * Get push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
}

