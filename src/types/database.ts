export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          avatar_url: string | null
          email: string | null
          semester: string | null
          branch: string | null
          college: string | null
          attendance_goal: number
          friend_code: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          semester?: string | null
          branch?: string | null
          college?: string | null
          attendance_goal?: number
          friend_code?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          semester?: string | null
          branch?: string | null
          college?: string | null
          attendance_goal?: number
          friend_code?: string | null
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          user_id: string
          name: string
          credits: number
          attendance_goal: number
          attended_classes: number
          total_classes: number
          color: string | null
          icon: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          credits?: number
          attendance_goal?: number
          attended_classes?: number
          total_classes?: number
          color?: string | null
          icon?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          credits?: number
          attendance_goal?: number
          attended_classes?: number
          total_classes?: number
          color?: string | null
          icon?: string | null
          notes?: string | null
          updated_at?: string
        }
      }
      attendance_records: {
        Row: {
          id: string
          user_id: string
          subject_id: string
          date: string
          status: 'present' | 'absent' | 'proxy'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id: string
          date: string
          status: 'present' | 'absent' | 'proxy'
          notes?: string | null
          created_at?: string
        }
        Update: {
          status?: 'present' | 'absent' | 'proxy'
          notes?: string | null
        }
      }
      proxy_ledger: {
        Row: {
          id: string
          user_id: string
          contact_name: string
          contact_email: string | null
          friend_user_id: string | null
          friend_code: string | null
          balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          contact_name: string
          contact_email?: string | null
          friend_user_id?: string | null
          friend_code?: string | null
          balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          contact_name?: string
          contact_email?: string | null
          friend_user_id?: string | null
          balance?: number
          updated_at?: string
        }
      }
      proxy_transactions: {
        Row: {
          id: string
          user_id: string
          ledger_id: string
          type: 'gave' | 'received'
          classes: number
          subject: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ledger_id: string
          type: 'gave' | 'received'
          classes: number
          subject?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          notes?: string | null
        }
      }
      timetable_entries: {
        Row: {
          id: string
          user_id: string
          subject_id: string
          day_of_week: number
          start_time: string
          end_time: string
          room: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_id: string
          day_of_week: number
          start_time: string
          end_time: string
          room?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          day_of_week?: number
          start_time?: string
          end_time?: string
          room?: string | null
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: 'warning' | 'info' | 'success' | 'proxy'
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: 'warning' | 'info' | 'success' | 'proxy'
          read?: boolean
          created_at?: string
        }
        Update: {
          read?: boolean
        }
      }
      settings: {
        Row: {
          id: string
          user_id: string
          theme: 'light' | 'dark' | 'system'
          notifications_enabled: boolean
          attendance_warning_threshold: number
          email_notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          theme?: 'light' | 'dark' | 'system'
          notifications_enabled?: boolean
          attendance_warning_threshold?: number
          email_notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          theme?: 'light' | 'dark' | 'system'
          notifications_enabled?: boolean
          attendance_warning_threshold?: number
          email_notifications?: boolean
          updated_at?: string
        }
      }
      calculator_history: {
        Row: {
          id: string
          user_id: string
          subject_name: string
          attended: number
          total: number
          target: number
          can_miss: number
          must_attend: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          subject_name: string
          attended: number
          total: number
          target: number
          can_miss: number
          must_attend: number
          created_at?: string
        }
        Update: Record<string, never>
      }
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Subject = Database['public']['Tables']['subjects']['Row']
export type AttendanceRecord = Database['public']['Tables']['attendance_records']['Row']
export type ProxyLedger = Database['public']['Tables']['proxy_ledger']['Row']
export type ProxyTransaction = Database['public']['Tables']['proxy_transactions']['Row']
export type TimetableEntry = Database['public']['Tables']['timetable_entries']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type Settings = Database['public']['Tables']['settings']['Row']
export type CalculatorHistory = Database['public']['Tables']['calculator_history']['Row']
