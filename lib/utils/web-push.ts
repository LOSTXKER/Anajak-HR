/**
 * Web Push Notifications Utilities
 * Using Web Push API for persistent notifications
 */

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

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

export interface PushSubscribeResult {
  success: boolean;
  subscription: PushSubscription | null;
  error?: string;
  errorCode?: 'NOT_SUPPORTED' | 'PERMISSION_DENIED' | 'SW_NOT_READY' | 'VAPID_MISSING' | 'SUBSCRIBE_FAILED' | 'BACKEND_FAILED';
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes('Mac') && 'ontouchend' in document);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (window.matchMedia('(display-mode: standalone)').matches) ||
    (window.navigator as any).standalone === true;
}

/**
 * Subscribe to push notifications with detailed error reporting
 */
export async function subscribeToPushNotifications(): Promise<PushSubscribeResult> {
  try {
    if (!('serviceWorker' in navigator)) {
      return {
        success: false,
        subscription: null,
        error: isIOS()
          ? 'กรุณาติดตั้งแอปผ่าน "Add to Home Screen" ใน Safari ก่อน'
          : 'Browser นี้ไม่รองรับ Push Notification',
        errorCode: 'NOT_SUPPORTED',
      };
    }

    if (!('PushManager' in window)) {
      return {
        success: false,
        subscription: null,
        error: isIOS() && !isStandalone()
          ? 'ต้องเปิดแอปจาก Home Screen (ติดตั้งผ่าน Safari → Share → "Add to Home Screen")'
          : 'Browser นี้ไม่รองรับ Push Notification',
        errorCode: 'NOT_SUPPORTED',
      };
    }

    if (!('Notification' in window)) {
      return {
        success: false,
        subscription: null,
        error: isIOS() && !isStandalone()
          ? 'ต้องเปิดแอปจาก Home Screen เพื่อใช้การแจ้งเตือน'
          : 'Browser ไม่รองรับ Notification API',
        errorCode: 'NOT_SUPPORTED',
      };
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        subscription: null,
        error: permission === 'denied'
          ? 'การแจ้งเตือนถูกบล็อก — ไปที่ Settings ของอุปกรณ์เพื่อเปิดการแจ้งเตือนสำหรับแอปนี้'
          : 'ไม่ได้รับอนุญาตการแจ้งเตือน กรุณาลองใหม่อีกครั้ง',
        errorCode: 'PERMISSION_DENIED',
      };
    }

    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
    ]);

    if (!registration) {
      return {
        success: false,
        subscription: null,
        error: 'Service Worker ยังไม่พร้อม — ลองปิดแอปแล้วเปิดใหม่',
        errorCode: 'SW_NOT_READY',
      };
    }

    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      const vapidPublicKey = VAPID_PUBLIC_KEY;

      if (!vapidPublicKey) {
        return {
          success: false,
          subscription: null,
          error: 'ระบบยังไม่ได้ตั้งค่า VAPID Key — กรุณาแจ้งผู้ดูแลระบบ',
          errorCode: 'VAPID_MISSING',
        };
      }

      try {
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as BufferSource,
        });
      } catch (subError: any) {
        return {
          success: false,
          subscription: null,
          error: `สมัคร Push ไม่สำเร็จ: ${subError.message || 'ไม่ทราบสาเหตุ'}`,
          errorCode: 'SUBSCRIBE_FAILED',
        };
      }

      try {
        await sendSubscriptionToBackend(subscription);
      } catch {
        return {
          success: false,
          subscription: null,
          error: 'บันทึก Push subscription ไปที่ server ไม่สำเร็จ',
          errorCode: 'BACKEND_FAILED',
        };
      }
    }

    return { success: true, subscription };
  } catch (error: any) {
    return {
      success: false,
      subscription: null,
      error: `เกิดข้อผิดพลาด: ${error.message || 'ไม่ทราบสาเหตุ'}`,
      errorCode: 'SUBSCRIBE_FAILED',
    };
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

    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);

    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await removeSubscriptionFromBackend(subscription);
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

    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);

    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch (error) {
    console.error('Error checking push subscription:', error);
    return false;
  }
}

async function sendSubscriptionToBackend(subscription: PushSubscription): Promise<void> {
  const { supabase } = await import('@/lib/supabase/client');
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: subscription.toJSON(),
      employeeId: user.id,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to send subscription to backend');
  }
}

async function removeSubscriptionFromBackend(subscription: PushSubscription): Promise<void> {
  try {
    const { supabase } = await import('@/lib/supabase/client');
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ employeeId: user.id }),
    });
  } catch (error) {
    console.error('Error removing subscription from backend:', error);
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator)) {
      return null;
    }

    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
    ]);

    if (!registration) {
      return null;
    }

    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
}
