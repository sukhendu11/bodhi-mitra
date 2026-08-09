export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string;
          id: string;
          link: string | null;
          message: string;
          read: boolean;
          type: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          link?: string | null;
          message: string;
          read?: boolean;
          type: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          link?: string | null;
          message?: string;
          read?: boolean;
          type?: string;
        };
        Relationships: [];
      };
      audit_log: {
        Row: {
          action: string;
          actor_id: string;
          created_at: string;
          details: Json;
          id: string;
          target_user_id: string | null;
        };
        Insert: {
          action: string;
          actor_id: string;
          created_at?: string;
          details?: Json;
          id?: string;
          target_user_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string;
          created_at?: string;
          details?: Json;
          id?: string;
          target_user_id?: string | null;
        };
        Relationships: [];
      };
      bookmarks: {
        Row: {
          created_at: string;
          id: string;
          resource_id: string;
          resource_type: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          resource_id: string;
          resource_type: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          resource_id?: string;
          resource_type?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      book_ratings: {
        Row: {
          book_id: string;
          created_at: string;
          id: string;
          rating: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          book_id: string;
          created_at?: string;
          id?: string;
          rating: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          book_id?: string;
          created_at?: string;
          id?: string;
          rating?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "book_ratings_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      books: {
        Row: {
          author_name: string;
          avg_rating: number;
          category: string;
          cover_image: string;
          created_at: string;
          description_bn: string;
          description_en: string;
          featured: boolean;
          id: string;
          is_free: boolean;
          isbn: string;
          meta_description_bn: string;
          meta_description_en: string;
          pages: number;
          pdf_file_size: number;
          pdf_url: string;
          price: number;
          search_vector: string | null;
          slug: string;
          sort_order: number;
          status: string;
          tags: string[];
          title_bn: string;
          title_en: string;
          total_ratings: number;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          author_name?: string;
          avg_rating?: number;
          category?: string;
          cover_image?: string;
          created_at?: string;
          description_bn?: string;
          description_en?: string;
          featured?: boolean;
          id?: string;
          is_free?: boolean;
          isbn?: string;
          meta_description_bn?: string;
          meta_description_en?: string;
          pages?: number;
          pdf_file_size?: number;
          pdf_url?: string;
          price?: number;
          search_vector?: string | null;
          slug: string;
          sort_order?: number;
          status?: string;
          tags?: string[];
          title_bn: string;
          title_en: string;
          total_ratings?: number;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          author_name?: string;
          avg_rating?: number;
          category?: string;
          cover_image?: string;
          created_at?: string;
          description_bn?: string;
          description_en?: string;
          featured?: boolean;
          id?: string;
          is_free?: boolean;
          isbn?: string;
          meta_description_bn?: string;
          meta_description_en?: string;
          pages?: number;
          pdf_file_size?: number;
          pdf_url?: string;
          price?: number;
          search_vector?: string | null;
          slug?: string;
          sort_order?: number;
          status?: string;
          tags?: string[];
          title_bn?: string;
          title_en?: string;
          total_ratings?: number;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [];
      };
      cart_items: {
        Row: {
          book_id: string;
          cart_id: string;
          created_at: string;
          id: string;
        };
        Insert: {
          book_id: string;
          cart_id: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          book_id?: string;
          cart_id?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cart_items_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "cart_items_cart_id_fkey";
            columns: ["cart_id"];
            isOneToOne: false;
            referencedRelation: "carts";
            referencedColumns: ["id"];
          },
        ];
      };
      carts: {
        Row: {
          created_at: string;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          color: string;
          created_at: string;
          description_bn: string;
          description_en: string;
          icon: string;
          id: string;
          name_bn: string;
          name_en: string;
          slug: string;
          sort_order: number;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          color?: string;
          created_at?: string;
          description_bn?: string;
          description_en?: string;
          icon?: string;
          id?: string;
          name_bn?: string;
          name_en: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          color?: string;
          created_at?: string;
          description_bn?: string;
          description_en?: string;
          icon?: string;
          id?: string;
          name_bn?: string;
          name_en?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [];
      };
      comments: {
        Row: {
          comment_text: string;
          created_at: string;
          id: string;
          parent_id: string | null;
          post_id: string;
          status: string;
          updated_at: string;
          user_id: string;
          user_name: string;
        };
        Insert: {
          comment_text: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          post_id: string;
          status?: string;
          updated_at?: string;
          user_id: string;
          user_name: string;
        };
        Update: {
          comment_text?: string;
          created_at?: string;
          id?: string;
          parent_id?: string | null;
          post_id?: string;
          status?: string;
          updated_at?: string;
          user_id?: string;
          user_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "comments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comments_post_id_fkey";
            columns: ["post_id"];
            isOneToOne: false;
            referencedRelation: "posts";
            referencedColumns: ["id"];
          },
        ];
      };
      contact_messages: {
        Row: {
          created_at: string;
          email: string;
          id: string;
          message: string;
          name: string;
          read: boolean;
        };
        Insert: {
          created_at?: string;
          email: string;
          id?: string;
          message: string;
          name: string;
          read?: boolean;
        };
        Update: {
          created_at?: string;
          email?: string;
          id?: string;
          message?: string;
          name?: string;
          read?: boolean;
        };
        Relationships: [];
      };
      content_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          content_id: string;
          content_type: string;
          created_at: string;
          details: Json;
          id: string;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          content_id: string;
          content_type: string;
          created_at?: string;
          details?: Json;
          id?: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          content_id?: string;
          content_type?: string;
          created_at?: string;
          details?: Json;
          id?: string;
        };
        Relationships: [];
      };
      content_categories: {
        Row: {
          category_id: string;
          content_id: string;
          content_type: string;
          created_at: string;
          id: string;
        };
        Insert: {
          category_id: string;
          content_id: string;
          content_type: string;
          created_at?: string;
          id?: string;
        };
        Update: {
          category_id?: string;
          content_id?: string;
          content_type?: string;
          created_at?: string;
          id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_categories_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      content_collections: {
        Row: {
          color: string;
          created_at: string;
          description: string;
          icon: string;
          id: string;
          label: string;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          description?: string;
          icon?: string;
          id?: string;
          label: string;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          description?: string;
          icon?: string;
          id?: string;
          label?: string;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_revisions: {
        Row: {
          changed_by: string | null;
          changes: string[];
          content_id: string;
          content_type: string;
          created_at: string;
          data: Json;
          id: string;
          summary: string;
          version: number;
        };
        Insert: {
          changed_by?: string | null;
          changes?: string[];
          content_id: string;
          content_type: string;
          created_at?: string;
          data?: Json;
          id?: string;
          summary?: string;
          version?: number;
        };
        Update: {
          changed_by?: string | null;
          changes?: string[];
          content_id?: string;
          content_type?: string;
          created_at?: string;
          data?: Json;
          id?: string;
          summary?: string;
          version?: number;
        };
        Relationships: [];
      };
      content_sections: {
        Row: {
          body_text: string;
          content_id: string;
          content_type: string;
          created_at: string;
          embedding: string | null;
          heading: string;
          id: string;
          metadata: Json;
          section_index: number;
          updated_at: string;
        };
        Insert: {
          body_text: string;
          content_id: string;
          content_type: string;
          created_at?: string;
          embedding?: string | null;
          heading?: string;
          id?: string;
          metadata?: Json;
          section_index: number;
          updated_at?: string;
        };
        Update: {
          body_text?: string;
          content_id?: string;
          content_type?: string;
          created_at?: string;
          embedding?: string | null;
          heading?: string;
          id?: string;
          metadata?: Json;
          section_index?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      content_tags: {
        Row: {
          content_id: string;
          content_type: string;
          created_at: string;
          id: string;
          tag_id: string;
        };
        Insert: {
          content_id: string;
          content_type: string;
          created_at?: string;
          id?: string;
          tag_id: string;
        };
        Update: {
          content_id?: string;
          content_type?: string;
          created_at?: string;
          id?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "content_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "tags";
            referencedColumns: ["id"];
          },
        ];
      };
      content_type_definitions: {
        Row: {
          api_endpoint: string | null;
          can_archive: boolean;
          can_duplicate: boolean;
          can_schedule: boolean;
          collection_id: string | null;
          content_type: string;
          created_at: string;
          custom_table: string | null;
          description: string;
          has_authors: boolean;
          has_categories: boolean;
          has_revisions: boolean;
          has_rich_content: boolean;
          has_seo: boolean;
          has_slug: boolean;
          has_sort_order: boolean;
          has_tags: boolean;
          icon: string;
          id: string;
          label: string;
          label_plural: string | null;
          name: string;
          preview_url: string;
          slug: string;
          updated_at: string;
          workflow_default_status: string;
          workflow_enabled: boolean;
          workflow_statuses: Json;
          workflow_transitions: Json;
        };
        Insert: {
          api_endpoint?: string | null;
          can_archive?: boolean;
          can_duplicate?: boolean;
          can_schedule?: boolean;
          collection_id?: string | null;
          content_type?: string;
          created_at?: string;
          custom_table?: string | null;
          description?: string;
          has_authors?: boolean;
          has_categories?: boolean;
          has_revisions?: boolean;
          has_rich_content?: boolean;
          has_seo?: boolean;
          has_slug?: boolean;
          has_sort_order?: boolean;
          has_tags?: boolean;
          icon?: string;
          id?: string;
          label: string;
          label_plural?: string | null;
          name: string;
          preview_url?: string;
          slug: string;
          updated_at?: string;
          workflow_default_status?: string;
          workflow_enabled?: boolean;
          workflow_statuses?: Json;
          workflow_transitions?: Json;
        };
        Update: {
          api_endpoint?: string | null;
          can_archive?: boolean;
          can_duplicate?: boolean;
          can_schedule?: boolean;
          collection_id?: string | null;
          content_type?: string;
          created_at?: string;
          custom_table?: string | null;
          description?: string;
          has_authors?: boolean;
          has_categories?: boolean;
          has_revisions?: boolean;
          has_rich_content?: boolean;
          has_seo?: boolean;
          has_slug?: boolean;
          has_sort_order?: boolean;
          has_tags?: boolean;
          icon?: string;
          id?: string;
          label?: string;
          label_plural?: string | null;
          name?: string;
          preview_url?: string;
          slug?: string;
          updated_at?: string;
          workflow_default_status?: string;
          workflow_enabled?: boolean;
          workflow_statuses?: Json;
          workflow_transitions?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "content_type_definitions_collection_id_fkey";
            columns: ["collection_id"];
            isOneToOne: false;
            referencedRelation: "content_collections";
            referencedColumns: ["id"];
          },
        ];
      };
      content_type_fields: {
        Row: {
          column_span: number;
          content_type_id: string;
          created_at: string;
          default_value: Json;
          description: string;
          description_bn: string;
          field_options: Json;
          field_type: string;
          group_name: string;
          id: string;
          label: string;
          label_bn: string;
          name: string;
          placeholder: string;
          placeholder_bn: string;
          required: boolean;
          seo_field: boolean;
          show_if: Json;
          sort_order: number;
          sub_fields: Json;
          system_field: boolean;
          tab_name: string;
          unique_field: boolean;
          updated_at: string;
          validation_rules: Json;
        };
        Insert: {
          column_span?: number;
          content_type_id: string;
          created_at?: string;
          default_value?: Json;
          description?: string;
          description_bn?: string;
          field_options?: Json;
          field_type: string;
          group_name?: string;
          id?: string;
          label: string;
          label_bn?: string;
          name: string;
          placeholder?: string;
          placeholder_bn?: string;
          required?: boolean;
          seo_field?: boolean;
          show_if?: Json;
          sort_order?: number;
          sub_fields?: Json;
          system_field?: boolean;
          tab_name?: string;
          unique_field?: boolean;
          updated_at?: string;
          validation_rules?: Json;
        };
        Update: {
          column_span?: number;
          content_type_id?: string;
          created_at?: string;
          default_value?: Json;
          description?: string;
          description_bn?: string;
          field_options?: Json;
          field_type?: string;
          group_name?: string;
          id?: string;
          label?: string;
          label_bn?: string;
          name?: string;
          placeholder?: string;
          placeholder_bn?: string;
          required?: boolean;
          seo_field?: boolean;
          show_if?: Json;
          sort_order?: number;
          sub_fields?: Json;
          system_field?: boolean;
          tab_name?: string;
          unique_field?: boolean;
          updated_at?: string;
          validation_rules?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "content_type_fields_content_type_id_fkey";
            columns: ["content_type_id"];
            isOneToOne: false;
            referencedRelation: "content_type_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      course_lessons: {
        Row: {
          content_bn: string;
          content_en: string;
          course_id: string;
          created_at: string;
          id: string;
          slug: string;
          sort_order: number;
          title_bn: string;
          title_en: string;
          updated_at: string;
          video_url: string | null;
        };
        Insert: {
          content_bn?: string;
          content_en?: string;
          course_id: string;
          created_at?: string;
          id?: string;
          slug: string;
          sort_order?: number;
          title_bn?: string;
          title_en?: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Update: {
          content_bn?: string;
          content_en?: string;
          course_id?: string;
          created_at?: string;
          id?: string;
          slug?: string;
          sort_order?: number;
          title_bn?: string;
          title_en?: string;
          updated_at?: string;
          video_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          category: string | null;
          cover_image: string | null;
          created_at: string;
          description_bn: string;
          description_en: string;
          duration_weeks: number;
          id: string;
          level: string;
          published: boolean;
          search_vector: string | null;
          slug: string;
          sort_order: number;
          title_bn: string;
          title_en: string;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          category?: string | null;
          cover_image?: string | null;
          created_at?: string;
          description_bn?: string;
          description_en?: string;
          duration_weeks?: number;
          id?: string;
          level?: string;
          published?: boolean;
          search_vector?: string | null;
          slug: string;
          sort_order?: number;
          title_bn?: string;
          title_en?: string;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          category?: string | null;
          cover_image?: string | null;
          created_at?: string;
          description_bn?: string;
          description_en?: string;
          duration_weeks?: number;
          id?: string;
          level?: string;
          published?: boolean;
          search_vector?: string | null;
          slug?: string;
          sort_order?: number;
          title_bn?: string;
          title_en?: string;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [];
      };
      coupons: {
        Row: {
          code: string;
          created_at: string;
          current_redemptions: number;
          description: string;
          discount_type: string;
          discount_value: number;
          expires_at: string | null;
          id: string;
          is_active: boolean;
          max_redemptions: number | null;
          min_purchase_amount: number;
          updated_at: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          current_redemptions?: number;
          description?: string;
          discount_type: string;
          discount_value: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_redemptions?: number | null;
          min_purchase_amount?: number;
          updated_at?: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          current_redemptions?: number;
          description?: string;
          discount_type?: string;
          discount_value?: number;
          expires_at?: string | null;
          id?: string;
          is_active?: boolean;
          max_redemptions?: number | null;
          min_purchase_amount?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      dynamic_content_items: {
        Row: {
          content_data: Json;
          content_type_id: string;
          created_at: string;
          created_by: string | null;
          id: string;
          scheduled_at: string | null;
          slug: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          content_data?: Json;
          content_type_id: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          scheduled_at?: string | null;
          slug?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          content_data?: Json;
          content_type_id?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          scheduled_at?: string | null;
          slug?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "dynamic_content_items_content_type_id_fkey";
            columns: ["content_type_id"];
            isOneToOne: false;
            referencedRelation: "content_type_definitions";
            referencedColumns: ["id"];
          },
        ];
      };
      enrollments: {
        Row: {
          completed_at: string | null;
          course_id: string;
          enrolled_at: string;
          id: string;
          user_id: string;
        };
        Insert: {
          completed_at?: string | null;
          course_id: string;
          enrolled_at?: string;
          id?: string;
          user_id: string;
        };
        Update: {
          completed_at?: string | null;
          course_id?: string;
          enrolled_at?: string;
          id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      lesson_progress: {
        Row: {
          completed: boolean;
          completed_at: string | null;
          course_id: string;
          created_at: string;
          id: string;
          lesson_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed?: boolean;
          completed_at?: string | null;
          course_id: string;
          created_at?: string;
          id?: string;
          lesson_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed?: boolean;
          completed_at?: string | null;
          course_id?: string;
          created_at?: string;
          id?: string;
          lesson_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "course_lessons";
            referencedColumns: ["id"];
          },
        ];
      };
      login_history: {
        Row: {
          created_at: string;
          email: string | null;
          id: string;
          ip_address: string | null;
          sign_in_method: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          id?: string;
          ip_address?: string | null;
          sign_in_method?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          id?: string;
          ip_address?: string | null;
          sign_in_method?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      media_asset_tags: {
        Row: {
          asset_id: string;
          created_at: string;
          tag_id: string;
        };
        Insert: {
          asset_id: string;
          created_at?: string;
          tag_id: string;
        };
        Update: {
          asset_id?: string;
          created_at?: string;
          tag_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_asset_tags_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "media_asset_tags_tag_id_fkey";
            columns: ["tag_id"];
            isOneToOne: false;
            referencedRelation: "media_tags";
            referencedColumns: ["id"];
          },
        ];
      };
      media_asset_versions: {
        Row: {
          asset_id: string;
          change_note: string | null;
          created_at: string;
          created_by: string | null;
          filename: string;
          file_size: number;
          height: number | null;
          id: string;
          mime_type: string;
          path: string;
          url: string;
          version_number: number;
          width: number | null;
        };
        Insert: {
          asset_id: string;
          change_note?: string | null;
          created_at?: string;
          created_by?: string | null;
          filename: string;
          file_size?: number;
          height?: number | null;
          id?: string;
          mime_type: string;
          path: string;
          url: string;
          version_number?: number;
          width?: number | null;
        };
        Update: {
          asset_id?: string;
          change_note?: string | null;
          created_at?: string;
          created_by?: string | null;
          filename?: string;
          file_size?: number;
          height?: number | null;
          id?: string;
          mime_type?: string;
          path?: string;
          url?: string;
          version_number?: number;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_asset_versions_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      media_assets: {
        Row: {
          alt_text: string | null;
          bucket: string;
          caption: string | null;
          checksum: string | null;
          created_at: string;
          description: string | null;
          duration: number | null;
          filename: string;
          file_size: number;
          folder_id: string | null;
          height: number | null;
          id: string;
          is_private: boolean;
          mime_type: string;
          original_filename: string | null;
          path: string;
          search_vector: string | null;
          updated_at: string;
          uploaded_by: string | null;
          url: string;
          width: number | null;
        };
        Insert: {
          alt_text?: string | null;
          bucket?: string;
          caption?: string | null;
          checksum?: string | null;
          created_at?: string;
          description?: string | null;
          duration?: number | null;
          filename: string;
          file_size?: number;
          folder_id?: string | null;
          height?: number | null;
          id?: string;
          is_private?: boolean;
          mime_type?: string;
          original_filename?: string | null;
          path: string;
          search_vector?: string | null;
          updated_at?: string;
          uploaded_by?: string | null;
          url: string;
          width?: number | null;
        };
        Update: {
          alt_text?: string | null;
          bucket?: string;
          caption?: string | null;
          checksum?: string | null;
          created_at?: string;
          description?: string | null;
          duration?: number | null;
          filename?: string;
          file_size?: number;
          folder_id?: string | null;
          height?: number | null;
          id?: string;
          is_private?: boolean;
          mime_type?: string;
          original_filename?: string | null;
          path?: string;
          search_vector?: string | null;
          updated_at?: string;
          uploaded_by?: string | null;
          url?: string;
          width?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_assets_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "media_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      media_favorites: {
        Row: {
          asset_id: string;
          created_at: string;
          user_id: string;
        };
        Insert: {
          asset_id: string;
          created_at?: string;
          user_id: string;
        };
        Update: {
          asset_id?: string;
          created_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_favorites_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      media_folders: {
        Row: {
          bucket: string;
          created_at: string;
          created_by: string | null;
          id: string;
          name: string;
          parent_id: string | null;
          path: string | null;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          bucket?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name: string;
          parent_id?: string | null;
          path?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          bucket?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          name?: string;
          parent_id?: string | null;
          path?: string | null;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_folders_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "media_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      media_tags: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          name: string;
          slug: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          name: string;
          slug: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          name?: string;
          slug?: string;
        };
        Relationships: [];
      };
      media_usage: {
        Row: {
          asset_id: string;
          created_at: string;
          field_name: string | null;
          id: string;
          resource_id: string;
          resource_type: string;
        };
        Insert: {
          asset_id: string;
          created_at?: string;
          field_name?: string | null;
          id?: string;
          resource_id: string;
          resource_type: string;
        };
        Update: {
          asset_id?: string;
          created_at?: string;
          field_name?: string | null;
          id?: string;
          resource_id?: string;
          resource_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_usage_asset_id_fkey";
            columns: ["asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      navigation_items: {
        Row: {
          created_at: string;
          icon: string;
          id: string;
          label_bn: string;
          label_en: string;
          location: string;
          parent_id: string | null;
          slug: string;
          sort_order: number;
          type: string;
          updated_at: string;
          url: string;
          visible: boolean;
        };
        Insert: {
          created_at?: string;
          icon?: string;
          id?: string;
          label_bn?: string;
          label_en: string;
          location?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          type?: string;
          updated_at?: string;
          url?: string;
          visible?: boolean;
        };
        Update: {
          created_at?: string;
          icon?: string;
          id?: string;
          label_bn?: string;
          label_en?: string;
          location?: string;
          parent_id?: string | null;
          slug?: string;
          sort_order?: number;
          type?: string;
          updated_at?: string;
          url?: string;
          visible?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "navigation_items_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "navigation_items";
            referencedColumns: ["id"];
          },
        ];
      };
      newsletter_subscribers: {
        Row: {
          active: boolean;
          created_at: string;
          email: string;
          id: string;
          unsubscribe_token: string | null;
          unsubscribed_at: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          email: string;
          id?: string;
          unsubscribe_token?: string | null;
          unsubscribed_at?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          email?: string;
          id?: string;
          unsubscribe_token?: string | null;
          unsubscribed_at?: string | null;
        };
        Relationships: [];
      };
      pages: {
        Row: {
          banner_url: string;
          body_bn: string;
          body_en: string;
          created_at: string;
          header_bn: string;
          header_en: string;
          id: string;
          meta_description_bn: string;
          meta_description_en: string;
          search_vector: string | null;
          sections: Json;
          slug: string;
          sort_order: number;
          title_bn: string;
          title_en: string;
          updated_at: string;
          visible: boolean;
        };
        Insert: {
          banner_url?: string;
          body_bn?: string;
          body_en?: string;
          created_at?: string;
          header_bn?: string;
          header_en?: string;
          id?: string;
          meta_description_bn?: string;
          meta_description_en?: string;
          search_vector?: string | null;
          sections?: Json;
          slug: string;
          sort_order?: number;
          title_bn: string;
          title_en: string;
          updated_at?: string;
          visible?: boolean;
        };
        Update: {
          banner_url?: string;
          body_bn?: string;
          body_en?: string;
          created_at?: string;
          header_bn?: string;
          header_en?: string;
          id?: string;
          meta_description_bn?: string;
          meta_description_en?: string;
          search_vector?: string | null;
          sections?: Json;
          slug?: string;
          sort_order?: number;
          title_bn?: string;
          title_en?: string;
          updated_at?: string;
          visible?: boolean;
        };
        Relationships: [];
      };
      posts: {
        Row: {
          author_image: string | null;
          author_name: string;
          category: Database["public"]["Enums"]["post_category"];
          content: string | null;
          content_bn: string | null;
          content_en: string | null;
          cover_image: string | null;
          created_at: string;
          excerpt: string | null;
          excerpt_bn: string | null;
          excerpt_en: string | null;
          id: string;
          search_vector: string | null;
          slug: string;
          status: Database["public"]["Enums"]["post_status"];
          tags: string[];
          title: string | null;
          title_bn: string | null;
          title_en: string | null;
          updated_at: string;
          view_count: number;
        };
        Insert: {
          author_image?: string | null;
          author_name?: string;
          category: Database["public"]["Enums"]["post_category"];
          content?: string | null;
          content_bn?: string | null;
          content_en?: string | null;
          cover_image?: string | null;
          created_at?: string;
          excerpt?: string | null;
          excerpt_bn?: string | null;
          excerpt_en?: string | null;
          id?: string;
          search_vector?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["post_status"];
          tags?: string[];
          title?: string | null;
          title_bn?: string | null;
          title_en?: string | null;
          updated_at?: string;
          view_count?: number;
        };
        Update: {
          author_image?: string | null;
          author_name?: string;
          category?: Database["public"]["Enums"]["post_category"];
          content?: string | null;
          content_bn?: string | null;
          content_en?: string | null;
          cover_image?: string | null;
          created_at?: string;
          excerpt?: string | null;
          excerpt_bn?: string | null;
          excerpt_en?: string | null;
          id?: string;
          search_vector?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["post_status"];
          tags?: string[];
          title?: string | null;
          title_bn?: string | null;
          title_en?: string | null;
          updated_at?: string;
          view_count?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          preferences: Json;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          preferences?: Json;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          preferences?: Json;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      purchases: {
        Row: {
          amount_paid: number;
          book_id: string;
          created_at: string;
          id: string;
          purchase_date: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          amount_paid?: number;
          book_id: string;
          created_at?: string;
          id?: string;
          purchase_date?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          amount_paid?: number;
          book_id?: string;
          created_at?: string;
          id?: string;
          purchase_date?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "purchases_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      reader_bookmarks: {
        Row: {
          book_id: string;
          created_at: string;
          id: string;
          label: string;
          page_number: number;
          user_id: string;
        };
        Insert: {
          book_id: string;
          created_at?: string;
          id?: string;
          label?: string;
          page_number: number;
          user_id: string;
        };
        Update: {
          book_id?: string;
          created_at?: string;
          id?: string;
          label?: string;
          page_number?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reader_bookmarks_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      reader_highlights: {
        Row: {
          book_id: string;
          color: string;
          created_at: string;
          id: string;
          page_number: number;
          position_data: Json;
          selection_text: string;
          user_id: string;
        };
        Insert: {
          book_id: string;
          color?: string;
          created_at?: string;
          id?: string;
          page_number: number;
          position_data?: Json;
          selection_text: string;
          user_id: string;
        };
        Update: {
          book_id?: string;
          color?: string;
          created_at?: string;
          id?: string;
          page_number?: number;
          position_data?: Json;
          selection_text?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reader_highlights_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      reader_notes: {
        Row: {
          book_id: string;
          color: string;
          created_at: string;
          id: string;
          page_number: number;
          text: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          book_id: string;
          color?: string;
          created_at?: string;
          id?: string;
          page_number: number;
          text: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          book_id?: string;
          color?: string;
          created_at?: string;
          id?: string;
          page_number?: number;
          text?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reader_notes_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      reading_progress: {
        Row: {
          book_id: string;
          completed: boolean;
          id: string;
          last_page: number;
          progress_pct: number;
          started_at: string;
          total_pages: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          book_id: string;
          completed?: boolean;
          id?: string;
          last_page?: number;
          progress_pct?: number;
          started_at?: string;
          total_pages?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          book_id?: string;
          completed?: boolean;
          id?: string;
          last_page?: number;
          progress_pct?: number;
          started_at?: string;
          total_pages?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey";
            columns: ["book_id"];
            isOneToOne: false;
            referencedRelation: "books";
            referencedColumns: ["id"];
          },
        ];
      };
      redirects: {
        Row: {
          created_at: string;
          from_path: string;
          hit_count: number;
          id: string;
          is_active: boolean;
          note: string;
          status_code: number;
          to_path: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          from_path: string;
          hit_count?: number;
          id?: string;
          is_active?: boolean;
          note?: string;
          status_code?: number;
          to_path: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          from_path?: string;
          hit_count?: number;
          id?: string;
          is_active?: boolean;
          note?: string;
          status_code?: number;
          to_path?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      role_hierarchy: {
        Row: {
          description: string | null;
          label: string;
          level: number;
          role: string;
        };
        Insert: {
          description?: string | null;
          label: string;
          level: number;
          role: string;
        };
        Update: {
          description?: string | null;
          label?: string;
          level?: number;
          role?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          action: string;
          allowed: boolean;
          created_at: string;
          id: string;
          resource: string;
          role: string;
        };
        Insert: {
          action: string;
          allowed?: boolean;
          created_at?: string;
          id?: string;
          resource: string;
          role: string;
        };
        Update: {
          action?: string;
          allowed?: boolean;
          created_at?: string;
          id?: string;
          resource?: string;
          role?: string;
        };
        Relationships: [];
      };
      search_analytics: {
        Row: {
          clicked_result_id: string | null;
          clicked_result_type: string | null;
          created_at: string;
          id: string;
          query: string;
          results_count: number;
          user_id: string | null;
        };
        Insert: {
          clicked_result_id?: string | null;
          clicked_result_type?: string | null;
          created_at?: string;
          id?: string;
          query: string;
          results_count?: number;
          user_id?: string | null;
        };
        Update: {
          clicked_result_id?: string | null;
          clicked_result_type?: string | null;
          created_at?: string;
          id?: string;
          query?: string;
          results_count?: number;
          user_id?: string | null;
        };
        Relationships: [];
      };
      site_settings: {
        Row: {
          config: Json;
          id: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          config?: Json;
          id?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          config?: Json;
          id?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [];
      };
      tags: {
        Row: {
          color: string;
          created_at: string;
          id: string;
          name_bn: string;
          name_en: string;
          slug: string;
        };
        Insert: {
          color?: string;
          created_at?: string;
          id?: string;
          name_bn?: string;
          name_en: string;
          slug: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          id?: string;
          name_bn?: string;
          name_en?: string;
          slug?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      videos: {
        Row: {
          created_at: string;
          description: string;
          id: string;
          search_vector: string | null;
          sort_order: number;
          status: string;
          thumbnail_url: string;
          title: string;
          updated_at: string;
          youtube_url: string;
        };
        Insert: {
          created_at?: string;
          description?: string;
          id?: string;
          search_vector?: string | null;
          sort_order?: number;
          status?: string;
          thumbnail_url?: string;
          title: string;
          updated_at?: string;
          youtube_url: string;
        };
        Update: {
          created_at?: string;
          description?: string;
          id?: string;
          search_vector?: string | null;
          sort_order?: number;
          status?: string;
          thumbnail_url?: string;
          title?: string;
          updated_at?: string;
          youtube_url?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      claim_admin_role: { Args: never; Returns: Json };
      get_admin_claim_status: {
        Args: never;
        Returns: {
          admin_exists: boolean;
          is_admin: boolean;
          user_id: string;
        }[];
      };
      get_user_roles: {
        Args: {
          _admin_id: string;
        };
        Returns: {
          user_id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          role: string | null;
          created_at: string | null;
        }[];
      };
      has_min_role: {
        Args: {
          _min_level: number;
          _user_id: string;
        };
        Returns: boolean;
      };
      has_permission: {
        Args: {
          _resource: string;
          _action: string;
          _user_id: string;
        };
        Returns: boolean;
      };
      has_role: {
        Args: {
          _role: string;
          _user_id: string;
        };
        Returns: boolean;
      };
      match_content_sections: {
        Args: {
          query_embedding: string;
          match_threshold?: number;
          match_count?: number;
          filter_content_type?: string;
          filter_content_id?: string;
        };
        Returns: {
          id: string;
          content_type: string;
          content_id: string;
          section_index: number;
          heading: string;
          body_text: string;
          similarity: number;
          metadata: Json;
          created_at: string;
        }[];
      };
      set_user_role: {
        Args: {
          _admin_id: string;
          _target_user_id: string;
          _new_role: string;
        };
        Returns: Json;
      };
    };
    Enums: {
      app_role: "user" | "admin" | "super_admin" | "editor";
      comment_status:
        | "pending"
        | "approved"
        | "rejected"
        | "spam";
      coupon_discount_type: "percentage" | "fixed_amount";
      course_status: "draft" | "published" | "archived";
      book_status: "draft" | "published" | "archived";
      navigation_location: "header" | "footer";
      navigation_type: "internal" | "external" | "dropdown";
      post_category: string;
      post_status: "draft" | "published";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema =
  DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (
        | DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
        | DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]
      )
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (
      | DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
      | DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"]
    )[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (
        DefaultSchema["Tables"] &
          DefaultSchema["Views"]
      )
    ? (
        DefaultSchema["Tables"] &
          DefaultSchema["Views"]
      )[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["user", "admin", "super_admin", "editor"],
      comment_status: [
        "pending",
        "approved",
        "rejected",
        "spam",
      ],
      coupon_discount_type: ["percentage", "fixed_amount"],
      course_status: ["draft", "published", "archived"],
      book_status: ["draft", "published", "archived"],
      navigation_location: ["header", "footer"],
      navigation_type: ["internal", "external", "dropdown"],
      post_category: [] as string[],
      post_status: ["draft", "published"],
    },
  },
} as const;
