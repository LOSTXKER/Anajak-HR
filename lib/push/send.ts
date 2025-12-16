/**
 * Server-side Push Notification Sender
 * Using web-push library
 */

import webpush from 'web-push';
import { supabaseServer } from '@/lib/supabase/server';

// Configure web-push with VAPID keys
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';
let vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@anajak-hr.com';

// Ensure vapidSubject starts with mailto: if it's an email
if (vapidSubject && !vapidSubject.startsWith('http') && !vapidSubject.startsWith('mailto:')) {
  vapidSubject = `mailto:${vapidSubject}`;
}

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * Send push notification to a specific employee
 */
export async function sendPushToEmployee(
  employeeId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return false;
    }

    // Get employee's push subscription
    const { data: subscription, error } = await supabaseServer
      .from('push_subscriptions')
      .select('subscription')
      .eq('employee_id', employeeId)
      .single();

    if (error || !subscription) {
      console.log(`No push subscription found for employee ${employeeId}`);
      return false;
    }

    // Send push notification
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-96x96.png',
      image: payload.image,
      data: payload.data || {},
      actions: payload.actions,
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      silent: payload.silent || false,
    });

    await webpush.sendNotification(
      subscription.subscription,
      pushPayload
    );

    console.log(`Push notification sent to employee ${employeeId}`);
    return true;

  } catch (error: any) {
    console.error(`Error sending push to employee ${employeeId}:`, error);
    
    // If subscription is invalid, delete it
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log(`Removing invalid subscription for employee ${employeeId}`);
      await supabaseServer
        .from('push_subscriptions')
        .delete()
        .eq('employee_id', employeeId);
    }
    
    return false;
  }
}

/**
 * Send push notification to multiple employees
 */
export async function sendPushToEmployees(
  employeeIds: string[],
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  const results = await Promise.allSettled(
    employeeIds.map(id => sendPushToEmployee(id, payload))
  );

  const sent = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
  const failed = results.length - sent;

  console.log(`Bulk push sent: ${sent} succeeded, ${failed} failed`);
  
  return { sent, failed };
}

/**
 * Send push notification to all employees with active subscriptions
 */
export async function sendPushToAllEmployees(
  payload: PushNotificationPayload
): Promise<{ sent: number; failed: number }> {
  try {
    // Get all active subscriptions
    const { data: subscriptions, error } = await supabaseServer
      .from('push_subscriptions')
      .select('employee_id');

    if (error || !subscriptions || subscriptions.length === 0) {
      console.log('No active push subscriptions found');
      return { sent: 0, failed: 0 };
    }

    const employeeIds = subscriptions.map(s => s.employee_id);
    return await sendPushToEmployees(employeeIds, payload);

  } catch (error) {
    console.error('Error sending push to all employees:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Send check-in reminder to all employees
 */
export async function sendCheckinReminders(): Promise<void> {
  await sendPushToAllEmployees({
    title: '⏰ ถึงเวลาเช็คอิน',
    body: 'อย่าลืมเช็คอินเวลาเข้างานนะครับ',
    data: { url: '/checkin', action: 'checkin-reminder' },
    tag: 'checkin-reminder',
    requireInteraction: true,
  });
}

/**
 * Send check-out reminder to all employees
 */
export async function sendCheckoutReminders(): Promise<void> {
  await sendPushToAllEmployees({
    title: '🏠 ถึงเวลาเช็คเอาท์',
    body: 'อย่าลืมเช็คเอาท์ก่อนกลับบ้านนะครับ',
    data: { url: '/checkout', action: 'checkout-reminder' },
    tag: 'checkout-reminder',
    requireInteraction: true,
  });
}

