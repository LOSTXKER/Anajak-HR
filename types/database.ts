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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}










