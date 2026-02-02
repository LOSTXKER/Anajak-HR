/**
 * Announcement Service
 * =============================================
 * Handles all announcement operations
 */

import { supabase } from "@/lib/supabase/client";

// Types
export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AnnouncementWithReadStatus extends Announcement {
  isRead: boolean;
}

export interface CreateAnnouncementData {
  title: string;
  content: string;
  type: string;
  priority: string;
  is_active?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  created_by: string;
}

// Result types
interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Get all active announcements
 */
export async function getActiveAnnouncements(): Promise<
  ServiceResult<Announcement[]>
> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch announcements";
    return { data: null, error: message };
  }
}

/**
 * Get all announcements (admin)
 */
export async function getAllAnnouncements(): Promise<
  ServiceResult<Announcement[]>
> {
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch announcements";
    return { data: null, error: message };
  }
}

/**
 * Get announcements with read status for a user
 */
export async function getAnnouncementsWithReadStatus(
  employeeId: string
): Promise<ServiceResult<AnnouncementWithReadStatus[]>> {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Get active announcements
    const { data: announcements, error: announcementError } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`)
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (announcementError) throw announcementError;

    // Get read statuses
    const { data: reads, error: readsError } = await supabase
      .from("announcement_reads")
      .select("announcement_id")
      .eq("employee_id", employeeId);

    if (readsError) throw readsError;

    const readIds = new Set((reads || []).map((r: { announcement_id: string }) => r.announcement_id));

    const announcementsWithStatus = (announcements || []).map((a: Announcement) => ({
      ...a,
      isRead: readIds.has(a.id),
    }));

    return { data: announcementsWithStatus, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch announcements";
    return { data: null, error: message };
  }
}

/**
 * Get a single announcement by ID
 */
export async function getAnnouncementById(
  announcementId: string
): Promise<ServiceResult<Announcement>> {
  try {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("id", announcementId)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch announcement";
    return { data: null, error: message };
  }
}

/**
 * Create a new announcement
 */
export async function createAnnouncement(
  data: CreateAnnouncementData
): Promise<ServiceResult<Announcement>> {
  try {
    const { data: result, error } = await supabase
      .from("announcements")
      .insert({
        title: data.title,
        content: data.content,
        type: data.type,
        priority: data.priority,
        is_active: data.is_active ?? true,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        created_by: data.created_by,
      })
      .select()
      .single();

    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create announcement";
    return { data: null, error: message };
  }
}

/**
 * Update an announcement
 */
export async function updateAnnouncement(
  announcementId: string,
  data: Partial<CreateAnnouncementData>
): Promise<ServiceResult<Announcement>> {
  try {
    const { data: result, error } = await supabase
      .from("announcements")
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", announcementId)
      .select()
      .single();

    if (error) throw error;
    return { data: result, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update announcement";
    return { data: null, error: message };
  }
}

/**
 * Delete an announcement
 */
export async function deleteAnnouncement(
  announcementId: string
): Promise<ServiceResult<boolean>> {
  try {
    // First delete all read records
    await supabase
      .from("announcement_reads")
      .delete()
      .eq("announcement_id", announcementId);

    // Then delete the announcement
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete announcement";
    return { data: null, error: message };
  }
}

/**
 * Toggle announcement active status
 */
export async function toggleAnnouncementActive(
  announcementId: string,
  isActive: boolean
): Promise<ServiceResult<boolean>> {
  try {
    const { error } = await supabase
      .from("announcements")
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq("id", announcementId);

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to toggle announcement status";
    return { data: null, error: message };
  }
}

/**
 * Mark announcement as read
 */
export async function markAnnouncementAsRead(
  announcementId: string,
  employeeId: string
): Promise<ServiceResult<boolean>> {
  try {
    const { error } = await supabase.from("announcement_reads").upsert(
      {
        announcement_id: announcementId,
        employee_id: employeeId,
        read_at: new Date().toISOString(),
      },
      {
        onConflict: "announcement_id,employee_id",
      }
    );

    if (error) throw error;
    return { data: true, error: null };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to mark announcement as read";
    return { data: null, error: message };
  }
}

/**
 * Get unread count for an employee
 */
export async function getUnreadAnnouncementCount(
  employeeId: string
): Promise<ServiceResult<number>> {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Get active announcements count
    const { count: totalCount, error: announcementError } = await supabase
      .from("announcements")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .or(`start_date.is.null,start_date.lte.${today}`)
      .or(`end_date.is.null,end_date.gte.${today}`);

    if (announcementError) throw announcementError;

    // Get read count
    const { count: readCount, error: readsError } = await supabase
      .from("announcement_reads")
      .select("id", { count: "exact", head: true })
      .eq("employee_id", employeeId);

    if (readsError) throw readsError;

    const unreadCount = Math.max(0, (totalCount || 0) - (readCount || 0));
    return { data: unreadCount, error: null };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get unread count";
    return { data: null, error: message };
  }
}
