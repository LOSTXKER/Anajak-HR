export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      employees: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          role: 'staff' | 'supervisor' | 'admin'
          base_salary: number | null
          base_salary_rate: number | null
          ot_rate_1x: number | null
          ot_rate_1_5x: number | null
          ot_rate_2x: number | null
          face_profile_image_url: string | null
          device_id: string | null
          branch_id: string | null
          account_status: string | null
          line_user_id: string | null
          commission: number | null
          is_system_account: boolean | null
          created_at: string
          updated_at: string
          deleted_at: string | null
          deleted_by: string | null
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone: string
          role?: 'staff' | 'supervisor' | 'admin'
          base_salary?: number | null
          base_salary_rate?: number | null
          ot_rate_1x?: number | null
          ot_rate_1_5x?: number | null
          ot_rate_2x?: number | null
          face_profile_image_url?: string | null
          device_id?: string | null
          branch_id?: string | null
          account_status?: string | null
          line_user_id?: string | null
          commission?: number | null
          is_system_account?: boolean | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          phone?: string
          role?: 'staff' | 'supervisor' | 'admin'
          base_salary?: number | null
          base_salary_rate?: number | null
          ot_rate_1x?: number | null
          ot_rate_1_5x?: number | null
          ot_rate_2x?: number | null
          face_profile_image_url?: string | null
          device_id?: string | null
          branch_id?: string | null
          account_status?: string | null
          line_user_id?: string | null
          commission?: number | null
          is_system_account?: boolean | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
        }
      }
      branches: {
        Row: {
          id: string
          name: string
          address: string
          gps_lat: number
          gps_lng: number
          radius_meters: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          address: string
          gps_lat: number
          gps_lng: number
          radius_meters?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          address?: string
          gps_lat?: number
          gps_lng?: number
          radius_meters?: number
          created_at?: string
          updated_at?: string
        }
      }
      attendance_logs: {
        Row: {
          id: string
          employee_id: string
          work_date: string
          clock_in_time: string | null
          clock_in_gps_lat: number | null
          clock_in_gps_lng: number | null
          clock_in_photo_url: string | null
          clock_out_time: string | null
          clock_out_gps_lat: number | null
          clock_out_gps_lng: number | null
          clock_out_photo_url: string | null
          total_hours: number | null
          is_late: boolean
          status: 'present' | 'absent' | 'leave' | 'holiday' | 'wfh'
          work_mode: 'onsite' | 'wfh' | 'field' | null
          note: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          work_date: string
          clock_in_time?: string | null
          clock_in_gps_lat?: number | null
          clock_in_gps_lng?: number | null
          clock_in_photo_url?: string | null
          clock_out_time?: string | null
          clock_out_gps_lat?: number | null
          clock_out_gps_lng?: number | null
          clock_out_photo_url?: string | null
          total_hours?: number | null
          is_late?: boolean
          status?: 'present' | 'absent' | 'leave' | 'holiday' | 'wfh'
          work_mode?: 'onsite' | 'wfh' | 'field' | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          work_date?: string
          clock_in_time?: string | null
          clock_in_gps_lat?: number | null
          clock_in_gps_lng?: number | null
          clock_in_photo_url?: string | null
          clock_out_time?: string | null
          clock_out_gps_lat?: number | null
          clock_out_gps_lng?: number | null
          clock_out_photo_url?: string | null
          total_hours?: number | null
          is_late?: boolean
          status?: 'present' | 'absent' | 'leave' | 'holiday' | 'wfh'
          work_mode?: 'onsite' | 'wfh' | 'field' | null
          note?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ot_requests: {
        Row: {
          id: string
          employee_id: string
          ot_type: 'normal' | 'holiday' | 'pre_shift'
          request_date: string
          requested_start_time: string
          requested_end_time: string
          approved_start_time: string | null
          approved_end_time: string | null
          actual_start_time: string | null
          actual_end_time: string | null
          reason: string
          status: 'pending' | 'approved' | 'rejected' | 'completed'
          before_photo_url: string | null
          after_photo_url: string | null
          approved_by: string | null
          actual_ot_hours: number | null
          approved_ot_hours: number | null
          ot_rate: number | null
          ot_amount: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          ot_type?: 'normal' | 'holiday' | 'pre_shift'
          request_date: string
          requested_start_time: string
          requested_end_time: string
          approved_start_time?: string | null
          approved_end_time?: string | null
          actual_start_time?: string | null
          actual_end_time?: string | null
          reason: string
          status?: 'pending' | 'approved' | 'rejected' | 'completed'
          before_photo_url?: string | null
          after_photo_url?: string | null
          approved_by?: string | null
          actual_ot_hours?: number | null
          approved_ot_hours?: number | null
          ot_rate?: number | null
          ot_amount?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          ot_type?: 'normal' | 'holiday' | 'pre_shift'
          request_date?: string
          requested_start_time?: string
          requested_end_time?: string
          approved_start_time?: string | null
          approved_end_time?: string | null
          actual_start_time?: string | null
          actual_end_time?: string | null
          reason?: string
          status?: 'pending' | 'approved' | 'rejected' | 'completed'
          before_photo_url?: string | null
          after_photo_url?: string | null
          approved_by?: string | null
          actual_ot_hours?: number | null
          approved_ot_hours?: number | null
          ot_rate?: number | null
          ot_amount?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      holidays: {
        Row: {
          id: string
          date: string
          name: string
          type: 'public' | 'company' | 'branch'
          branch_id: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          date: string
          name: string
          type?: 'public' | 'company' | 'branch'
          branch_id?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          date?: string
          name?: string
          type?: 'public' | 'company' | 'branch'
          branch_id?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      leave_requests: {
        Row: {
          id: string
          employee_id: string
          leave_type: 'annual' | 'sick' | 'personal' | 'maternity' | 'military' | 'other'
          start_date: string
          end_date: string
          is_half_day: boolean
          reason: string
          attachment_url: string | null
          status: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by: string | null
          approved_at: string | null
          cancelled_by: string | null
          cancelled_at: string | null
          cancel_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          leave_type: 'annual' | 'sick' | 'personal' | 'maternity' | 'military' | 'other'
          start_date: string
          end_date: string
          is_half_day?: boolean
          reason: string
          attachment_url?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by?: string | null
          approved_at?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          leave_type?: 'annual' | 'sick' | 'personal' | 'maternity' | 'military' | 'other'
          start_date?: string
          end_date?: string
          is_half_day?: boolean
          reason?: string
          attachment_url?: string | null
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by?: string | null
          approved_at?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      wfh_requests: {
        Row: {
          id: string
          employee_id: string
          request_date: string
          reason: string
          status: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by: string | null
          approved_at: string | null
          cancelled_by: string | null
          cancelled_at: string | null
          cancel_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          request_date: string
          reason: string
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by?: string | null
          approved_at?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          request_date?: string
          reason?: string
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by?: string | null
          approved_at?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      late_requests: {
        Row: {
          id: string
          employee_id: string
          request_date: string
          reason: string
          status: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by: string | null
          approved_at: string | null
          cancelled_by: string | null
          cancelled_at: string | null
          cancel_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          request_date: string
          reason: string
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by?: string | null
          approved_at?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          request_date?: string
          reason?: string
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by?: string | null
          approved_at?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      field_work_requests: {
        Row: {
          id: string
          employee_id: string
          request_date: string
          location: string
          reason: string
          status: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by: string | null
          approved_at: string | null
          cancelled_by: string | null
          cancelled_at: string | null
          cancel_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          request_date: string
          location: string
          reason: string
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by?: string | null
          approved_at?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          request_date?: string
          location?: string
          reason?: string
          status?: 'pending' | 'approved' | 'rejected' | 'cancelled'
          approved_by?: string | null
          approved_at?: string | null
          cancelled_by?: string | null
          cancelled_at?: string | null
          cancel_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      system_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      announcements: {
        Row: {
          id: string
          title: string
          message: string
          priority: 'low' | 'normal' | 'high' | 'urgent'
          category: 'general' | 'hr' | 'payroll' | 'holiday' | 'urgent'
          target_type: 'all' | 'branch' | 'department' | 'employee'
          target_branch_id: string | null
          target_employee_ids: string[] | null
          published: boolean
          published_at: string | null
          expires_at: string | null
          send_notification: boolean
          notification_sent_at: string | null
          created_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          title: string
          message: string
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          category?: 'general' | 'hr' | 'payroll' | 'holiday' | 'urgent'
          target_type?: 'all' | 'branch' | 'department' | 'employee'
          target_branch_id?: string | null
          target_employee_ids?: string[] | null
          published?: boolean
          published_at?: string | null
          expires_at?: string | null
          send_notification?: boolean
          notification_sent_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          message?: string
          priority?: 'low' | 'normal' | 'high' | 'urgent'
          category?: 'general' | 'hr' | 'payroll' | 'holiday' | 'urgent'
          target_type?: 'all' | 'branch' | 'department' | 'employee'
          target_branch_id?: string | null
          target_employee_ids?: string[] | null
          published?: boolean
          published_at?: string | null
          expires_at?: string | null
          send_notification?: boolean
          notification_sent_at?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      announcement_reads: {
        Row: {
          id: string
          announcement_id: string
          employee_id: string
          read_at: string
        }
        Insert: {
          id?: string
          announcement_id: string
          employee_id: string
          read_at?: string
        }
        Update: {
          id?: string
          announcement_id?: string
          employee_id?: string
          read_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          employee_id: string
          subscription: Json
          user_agent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          subscription: Json
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          subscription?: Json
          user_agent?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      atomic_checkin: {
        Args: {
          p_employee_id: string
          p_work_date: string
          p_clock_in_time: string
          p_clock_in_location?: Json
          p_clock_in_photo_url?: string
          p_is_late?: boolean
          p_late_minutes?: number
        }
        Returns: Json
      }
      atomic_checkout: {
        Args: {
          p_employee_id: string
          p_work_date: string
          p_clock_out_time: string
          p_clock_out_location?: Json
          p_clock_out_photo_url?: string
        }
        Returns: Json
      }
      atomic_start_ot: {
        Args: {
          p_ot_id: string
          p_actual_start_time: string
          p_before_photo_url: string
          p_ot_type?: string
          p_ot_rate?: number
          p_start_location?: Json
        }
        Returns: Json
      }
      atomic_end_ot: {
        Args: {
          p_ot_id: string
          p_actual_end_time: string
          p_after_photo_url: string
          p_actual_ot_hours: number
          p_ot_amount: number
          p_end_location?: Json
        }
        Returns: Json
      }
      get_my_role: {
        Args: Record<string, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}












