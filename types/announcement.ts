// Announcement Types

export type AnnouncementPriority = 'low' | 'normal' | 'high' | 'urgent';
export type AnnouncementCategory = 'general' | 'hr' | 'payroll' | 'holiday' | 'urgent';
export type AnnouncementTargetType = 'all' | 'branch' | 'department' | 'employee';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: AnnouncementPriority;
  category: AnnouncementCategory;
  
  target_type: AnnouncementTargetType;
  target_branch_id: string | null;
  target_employee_ids: string[] | null;
  
  published: boolean;
  published_at: string | null;
  expires_at: string | null;
  
  send_notification: boolean;
  notification_sent_at: string | null;
  
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Joined data
  creator_name?: string;
  read_count?: number;
  total_target_count?: number;
  is_read?: boolean;
}

export interface AnnouncementRead {
  id: string;
  announcement_id: string;
  employee_id: string;
  read_at: string;
}

export interface AnnouncementFormData {
  title: string;
  message: string;
  priority: AnnouncementPriority;
  category: AnnouncementCategory;
  target_type: AnnouncementTargetType;
  target_branch_id?: string;
  target_employee_ids?: string[];
  send_notification: boolean;
  expires_at?: string;
}

