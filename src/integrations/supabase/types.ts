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
          base_points: number
          category: string | null
          clue: string
          created_at: string
          difficulty: number
          dislikes_count: number
          explanation: string | null
          external_id: string | null
          hint: string | null
          id: string
          is_active: boolean
          likes_count: number
          skip_count: number
          solved_count: number
          type: string | null
          updated_at: string
        }
        Insert: {
          alt_answer?: string | null
          answer: string
          base_points?: number
          category?: string | null
          clue: string
          created_at?: string
          difficulty?: number
          dislikes_count?: number
          explanation?: string | null
          external_id?: string | null
          hint?: string | null
          id?: string
          is_active?: boolean
          likes_count?: number
          skip_count?: number
          solved_count?: number
          type?: string | null
          updated_at?: string
        }
        Update: {
          alt_answer?: string | null
          answer?: string
          base_points?: number
          category?: string | null
          clue?: string
          created_at?: string
          difficulty?: number
          dislikes_count?: number
          explanation?: string | null
          external_id?: string | null
          hint?: string | null
          id?: string
          is_active?: boolean
          likes_count?: number
          skip_count?: number
          solved_count?: number
          type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feedback: {
        Row: {
          contact_email: string | null
          created_at: string
          id: string
          message: string
          status: string
          subject: string | null
          type: Database["public"]["Enums"]["feedback_type"]
          user_id: string | null
        }
        Insert: {
          contact_email?: string | null
          created_at?: string
          id?: string
          message: string
          status?: string
          subject?: string | null
          type?: Database["public"]["Enums"]["feedback_type"]
          user_id?: string | null
        }
        Update: {
          contact_email?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string | null
          type?: Database["public"]["Enums"]["feedback_type"]
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
            referencedRelation: "clues"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          accessibility_prefs: Json
          auth_provider: string | null
          auto_next: boolean
          avatar_url: string | null
          best_streak: number
          created_at: string
          current_streak: number
          display_name: string | null
          display_name_confirmed: boolean
          email: string | null
          id: string
          is_private: boolean
          level: number
          notification_prefs: Json
          solved_count: number
          total_score: number
          updated_at: string
          username: string
        }
        Insert: {
          accessibility_prefs?: Json
          auth_provider?: string | null
          auto_next?: boolean
          avatar_url?: string | null
          best_streak?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          display_name_confirmed?: boolean
          email?: string | null
          id: string
          is_private?: boolean
          level?: number
          notification_prefs?: Json
          solved_count?: number
          total_score?: number
          updated_at?: string
          username: string
        }
        Update: {
          accessibility_prefs?: Json
          auth_provider?: string | null
          auto_next?: boolean
          avatar_url?: string | null
          best_streak?: number
          created_at?: string
          current_streak?: number
          display_name?: string | null
          display_name_confirmed?: boolean
          email?: string | null
          id?: string
          is_private?: boolean
          level?: number
          notification_prefs?: Json
          solved_count?: number
          total_score?: number
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      puzzle_submissions: {
        Row: {
          clue_text: string
          created_at: string
          id: string
          notes: string | null
          status: string
          suggested_answer: string
          updated_at: string
          user_id: string
        }
        Insert: {
          clue_text: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          suggested_answer: string
          updated_at?: string
          user_id: string
        }
        Update: {
          clue_text?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          suggested_answer?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      feedback_type: ["bug", "feature", "complaint", "idea", "other"],
    },
  },
} as const
