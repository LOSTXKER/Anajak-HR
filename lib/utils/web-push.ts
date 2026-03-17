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

let _swDebugInfo = '';

export function getSwDebugInfo(): string {
  return _swDebugInfo;
}

async function ensureServiceWorkerReady(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    _swDebugInfo = 'serviceWorker not in navigator';
    return null;
  }

  const debugParts: string[] = [];

  const getState = (r: ServiceWorkerRegistration) => {
    if (r.active) return `active(${r.active.state})`;
    if (r.waiting) return `waiting(${r.waiting.state})`;
    if (r.installing) return `installing(${r.installing.state})`;
    return 'no-worker';
  };

  const waitForActivation = (reg: ServiceWorkerRegistration): Promise<'activated' | 'redundant' | 'timeout'> => {
    return new Promise((resolve) => {
      const worker = reg.installing || reg.waiting;
      if (!worker) { resolve('timeout'); return; }

      const check = () => {
        if (worker.state === 'activated') { worker.removeEventListener('statechange', check); resolve('activated'); }
        else if (worker.state === 'redundant') { worker.removeEventListener('statechange', check); resolve('redundant'); }
      };
      worker.addEventListener('statechange', check);
      if (worker.state === 'activated') { resolve('activated'); return; }
      if (worker.state === 'redundant') { resolve('redundant'); return; }
      setTimeout(() => { worker.removeEventListener('statechange', check); resolve('timeout'); }, 20000);
    });
  };

  let reg = await navigator.serviceWorker.getRegistration('/');
  debugParts.push(reg ? `reg:found(scope=${reg.scope})` : 'reg:none');

  if (reg && !reg.active && !reg.installing && !reg.waiting) {
    debugParts.push('stale-reg:unregistering');
    await reg.unregister();
    reg = undefined;
  }

  if (!reg) {
    try {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      debugParts.push(`register:ok`);
    } catch (e: any) {
      _swDebugInfo = `register failed: ${e.message}`;
      return null;
    }
  }

  debugParts.push(`state:${getState(reg)}`);

  if (reg.active) {
    _swDebugInfo = debugParts.join(' | ');
    return reg;
  }

  const result = await waitForActivation(reg);
  debugParts.push(`wait-result:${result}`);

  if (result === 'redundant') {
    debugParts.push('retry:unregister');
    await reg.unregister();
    try {
      reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      debugParts.push('retry:register-ok');
      const retryResult = await waitForActivation(reg);
      debugParts.push(`retry-result:${retryResult}`);
    } catch (e: any) {
      debugParts.push(`retry:register-fail(${e.message})`);
      _swDebugInfo = debugParts.join(' | ');
      return null;
    }
  }

  if (reg.active) {
    _swDebugInfo = debugParts.join(' | ');
    return reg;
  }

  debugParts.push('trying-ready');
  const ready = await Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
  ]);

  debugParts.push(ready ? `ready:ok` : 'ready:timeout');
  _swDebugInfo = debugParts.join(' | ');
  return ready;
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

    const registration = await ensureServiceWorkerReady();

    if (!registration) {
      return {
        success: false,
        subscription: null,
        error: `Service Worker ยังไม่พร้อม — ลองปิดแอปแล้วเปิดใหม่ [${_swDebugInfo}]`,
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
    const registration = await ensureServiceWorkerReady();

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
    if (!('PushManager' in window)) {
      return false;
    }

    const registration = await ensureServiceWorkerReady();

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
    const registration = await ensureServiceWorkerReady();

    if (!registration) {
      return null;
    }

    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Error getting push subscription:', error);
    return null;
  }
}
