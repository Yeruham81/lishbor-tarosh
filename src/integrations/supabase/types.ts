export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      challenges: {
        Row: {
          challenger_hints: number
          challenger_id: string
          challenger_score: number
          challenger_wrong: number
          clue_id: string
          created_at: string
          id: string
          token: string
        }
        Insert: {
          challenger_hints?: number
          challenger_id: string
          challenger_score?: number
          challenger_wrong?: number
          clue_id: string
          created_at?: string
          id?: string
          token: string
        }
        Update: {
          challenger_hints?: number
          challenger_id?: string
          challenger_score?: number
          challenger_wrong?: number
          clue_id?: string
          created_at?: string
          id?: string
          token?: string
        }
        Relationships: []
      }
      clue_ratings: {
        Row: {
          clue_id: string
          created_at: string
          id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          clue_id: string
          created_at?: string
          id?: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          clue_id?: string
          created_at?: string
          id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clues: {
        Row: {
          alt_answer: string | null
          answer: string
          approved_from_submission_id: string | null
          base_points: number
          category: string | null
          clue: string
          created_at: string
          deleted_at: string | null
          difficulty: number
          dislikes_count: number
          expire_at: string | null
          explanation: string | null
          external_id: string | null
          hint: string | null
          id: string
          internal_notes: string | null
          is_active: boolean
          likes_count: number
          publish_at: string | null
          skip_count: number
          solved_count: number
          status: Database["public"]["Enums"]["clue_status"]
          times_displayed: number
          type: string | null
          updated_at: string
        }
        Insert: {
          alt_answer?: string | null
          answer: string
          approved_from_submission_id?: string | null
          base_points?: number
          category?: string | null
          clue: string
          created_at?: string
          deleted_at?: string | null
          difficulty?: number
          dislikes_count?: number
          expire_at?: string | null
          explanation?: string | null
          external_id?: string | null
          hint?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          likes_count?: number
          publish_at?: string | null
          skip_count?: number
          solved_count?: number
          status?: Database["public"]["Enums"]["clue_status"]
          times_displayed?: number
          type?: string | null
          updated_at?: string
        }
        Update: {
          alt_answer?: string | null
          answer?: string
          approved_from_submission_id?: string | null
          base_points?: number
          category?: string | null
          clue?: string
          created_at?: string
          deleted_at?: string | null
          difficulty?: number
          dislikes_count?: number
          expire_at?: string | null
          explanation?: string | null
          external_id?: string | null
          hint?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean
          likes_count?: number
          publish_at?: string | null
          skip_count?: number
          solved_count?: number
          status?: Database["public"]["Enums"]["clue_status"]
          times_displayed?: number
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clues_approved_from_submission_id_fkey"
            columns: ["approved_from_submission_id"]
            isOneToOne: false
            referencedRelation: "puzzle_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          message: string
          read_at: string | null
          replied_at: string | null
          replied_by: string | null
          reply_text: string | null
          status: string
          subject: string | null
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          replied_at?: string | null
          replied_by?: string | null
          reply_text?: string | null
          status?: string
          subject?: string | null
          type?: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          replied_at?: string | null
          replied_by?: string | null
          reply_text?: string | null
          status?: string
          subject?: string | null
          type?: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      game_progress: {
        Row: {
          clue_id: string
          created_at: string
          hints_used: number
          id: string
          is_perfect: boolean
          is_solved: boolean
          revealed_letters: string[]
          score_earned: number
          solved_at: string | null
          updated_at: string
          user_id: string
          wrong_guesses: string[]
        }
        Insert: {
          clue_id: string
          created_at?: string
          hints_used?: number
          id?: string
          is_perfect?: boolean
          is_solved?: boolean
          revealed_letters?: string[]
          score_earned?: number
          solved_at?: string | null
          updated_at?: string
          user_id: string
          wrong_guesses?: string[]
        }
        Update: {
          clue_id?: string
          created_at?: string
          hints_used?: number
          id?: string
          is_perfect?: boolean
          is_solved?: boolean
          revealed_letters?: string[]
          score_earned?: number
          solved_at?: string | null
          updated_at?: string
          user_id?: string
          wrong_guesses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "game_progress_clue_id_fkey"
            columns: ["clue_id"]
            isOneToOne: false
            referencedRelation: "clue_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_progress_clue_id_fkey"
            columns: ["clue_id"]
            isOneToOne: false
            referencedRelation: "clues"
            referencedColumns: ["id"]
          },
        ]
      }
      hint_usage: {
        Row: {
          clue_id: string
          cost: number
          created_at: string
          id: string
          letter: string
          position: number
          user_id: string
        }
        Insert: {
          clue_id: string
          cost?: number
          created_at?: string
          id?: string
          letter: string
          position: number
          user_id: string
        }
        Update: {
          clue_id?: string
          cost?: number
          created_at?: string
          id?: string
          letter?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hint_usage_clue_id_fkey"
            columns: ["clue_id"]
            isOneToOne: false
            referencedRelation: "clue_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hint_usage_clue_id_fkey"
            columns: ["clue_id"]
            isOneToOne: false
            referencedRelation: "clues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accessibility_prefs: Json
          active_day_date: string | null
          active_day_solves: number
          age: number | null
          auth_provider: string | null
          auto_next: boolean
          avatar_url: string | null
          best_play_days_streak: number
          best_streak: number
          created_at: string
          current_play_days_streak: number
          current_streak: number
          definitions_played: number
          definitions_skipped: number
          display_name: string | null
          display_name_confirmed: boolean
          email: string | null
          highest_streak: number
          hints_used_total: number
          id: string
          is_blocked: boolean
          is_paid: boolean
          is_private: boolean
          last_play_date: string | null
          last_seen_at: string | null
          level: number
          notification_prefs: Json
          paid_at: string | null
          payment_amount: number | null
          perfect_solves: number
          player_level: number | null
          solved_count: number
          total_score: number
          updated_at: string
          username: string
          wrong_letters_total: number
        }
        Insert: {
          accessibility_prefs?: Json
          active_day_date?: string | null
          active_day_solves?: number
          age?: number | null
          auth_provider?: string | null
          auto_next?: boolean
          avatar_url?: string | null
          best_play_days_streak?: number
          best_streak?: number
          created_at?: string
          current_play_days_streak?: number
          current_streak?: number
          definitions_played?: number
          definitions_skipped?: number
          display_name?: string | null
          display_name_confirmed?: boolean
          email?: string | null
          highest_streak?: number
          hints_used_total?: number
          id: string
          is_blocked?: boolean
          is_paid?: boolean
          is_private?: boolean
          last_play_date?: string | null
          last_seen_at?: string | null
          level?: number
          notification_prefs?: Json
          paid_at?: string | null
          payment_amount?: number | null
          perfect_solves?: number
          player_level?: number | null
          solved_count?: number
          total_score?: number
          updated_at?: string
          username: string
          wrong_letters_total?: number
        }
        Update: {
          accessibility_prefs?: Json
          active_day_date?: string | null
          active_day_solves?: number
          age?: number | null
          auth_provider?: string | null
          auto_next?: boolean
          avatar_url?: string | null
          best_play_days_streak?: number
          best_streak?: number
          created_at?: string
          current_play_days_streak?: number
          current_streak?: number
          definitions_played?: number
          definitions_skipped?: number
          display_name?: string | null
          display_name_confirmed?: boolean
          email?: string | null
          highest_streak?: number
          hints_used_total?: number
          id?: string
          is_blocked?: boolean
          is_paid?: boolean
          is_private?: boolean
          last_play_date?: string | null
          last_seen_at?: string | null
          level?: number
          notification_prefs?: Json
          paid_at?: string | null
          payment_amount?: number | null
          perfect_solves?: number
          player_level?: number | null
          solved_count?: number
          total_score?: number
          updated_at?: string
          username?: string
          wrong_letters_total?: number
        }
        Relationships: []
      }
      puzzle_submissions: {
        Row: {
          admin_notes: string | null
          approved_clue_id: string | null
          category: string | null
          clue_text: string
          created_at: string
          edited_answer: string | null
          edited_category: string | null
          edited_clue: string | null
          edited_difficulty: number | null
          edited_explanation: string | null
          id: string
          notes: string | null
          points_awarded: number
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          suggested_answer: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          approved_clue_id?: string | null
          category?: string | null
          clue_text: string
          created_at?: string
          edited_answer?: string | null
          edited_category?: string | null
          edited_clue?: string | null
          edited_difficulty?: number | null
          edited_explanation?: string | null
          id?: string
          notes?: string | null
          points_awarded?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_answer: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          approved_clue_id?: string | null
          category?: string | null
          clue_text?: string
          created_at?: string
          edited_answer?: string | null
          edited_category?: string | null
          edited_clue?: string | null
          edited_difficulty?: number | null
          edited_explanation?: string | null
          id?: string
          notes?: string | null
          points_awarded?: number
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          suggested_answer?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "puzzle_submissions_approved_clue_id_fkey"
            columns: ["approved_clue_id"]
            isOneToOne: false
            referencedRelation: "clue_health"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puzzle_submissions_approved_clue_id_fkey"
            columns: ["approved_clue_id"]
            isOneToOne: false
            referencedRelation: "clues"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      clue_health: {
        Row: {
          answer: string | null
          clue: string | null
          deleted_at: string | null
          dislikes_count: number | null
          high_dislikes: boolean | null
          high_skips: boolean | null
          id: string | null
          likes_count: number | null
          low_success_rate: boolean | null
          missing_explanation: boolean | null
          missing_hint: boolean | null
          never_shown: boolean | null
          skip_count: number | null
          solved_count: number | null
          status: Database["public"]["Enums"]["clue_status"] | null
          success_rate: number | null
          times_displayed: number | null
          very_high_failure: boolean | null
        }
        Insert: {
          answer?: string | null
          clue?: string | null
          deleted_at?: string | null
          dislikes_count?: number | null
          high_dislikes?: never
          high_skips?: never
          id?: string | null
          likes_count?: number | null
          low_success_rate?: never
          missing_explanation?: never
          missing_hint?: never
          never_shown?: never
          skip_count?: number | null
          solved_count?: number | null
          status?: Database["public"]["Enums"]["clue_status"] | null
          success_rate?: never
          times_displayed?: number | null
          very_high_failure?: never
        }
        Update: {
          answer?: string | null
          clue?: string | null
          deleted_at?: string | null
          dislikes_count?: number | null
          high_dislikes?: never
          high_skips?: never
          id?: string | null
          likes_count?: number | null
          low_success_rate?: never
          missing_explanation?: never
          missing_hint?: never
          never_shown?: never
          skip_count?: number | null
          solved_count?: number | null
          status?: Database["public"]["Enums"]["clue_status"] | null
          success_rate?: never
          times_displayed?: number | null
          very_high_failure?: never
        }
        Relationships: []
      }
    }
    Functions: {
      admin_adjust_points: {
        Args: { _delta: number; _reason?: string; _user_id: string }
        Returns: number
      }
      admin_approve_submission: {
        Args: { _difficulty?: number; _points?: number; _submission_id: string }
        Returns: string
      }
      admin_category_performance: {
        Args: never
        Returns: {
          avg_success: number
          category: string
          total: number
          total_solves: number
        }[]
      }
      admin_daily_active_users: {
        Args: { _days?: number }
        Returns: {
          day: string
          users: number
        }[]
      }
      admin_kpis: { Args: { _active_window_days?: number }; Returns: Json }
      admin_reject_submission: {
        Args: { _notes?: string; _submission_id: string }
        Returns: undefined
      }
      admin_set_user_blocked: {
        Args: { _blocked: boolean; _user_id: string }
        Returns: undefined
      }
      admin_soft_delete_clue: { Args: { _clue_id: string }; Returns: undefined }
      admin_submission_trends: {
        Args: { _days?: number }
        Returns: {
          approved: number
          day: string
          rejected: number
          submitted: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_blocked: { Args: { _uid: string }; Returns: boolean }
      is_submissions_enabled: { Args: never; Returns: boolean }
      touch_last_seen: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      clue_status: "draft" | "active" | "inactive" | "archived" | "hidden"
      feedback_type: "bug" | "feature" | "complaint" | "idea" | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      clue_status: ["draft", "active", "inactive", "archived", "hidden"],
      feedback_type: ["bug", "feature", "complaint", "idea", "other"],
    },
  },
} as const
