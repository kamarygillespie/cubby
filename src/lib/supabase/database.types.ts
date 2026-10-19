// Hand-maintained to mirror supabase/migrations/20260910000000_initial_schema.sql.
// Regenerate with `supabase gen types typescript --linked` (requires SUPABASE_ACCESS_TOKEN)
// once available, and replace this file wholesale rather than hand-editing around it.

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          is_system?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      item_types: {
        Row: {
          id: string;
          user_id: string | null;
          category_id: string;
          name: string;
          is_system: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          category_id: string;
          name: string;
          is_system?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["item_types"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "item_types_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      items: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          image_url: string | null;
          link: string | null;
          price: number | null;
          sale_price: number | null;
          discount_percent: number | null;
          interest_level: number | null;
          purchased: boolean;
          purchased_date: string | null;
          gifted: boolean;
          notes: string | null;
          store_brand: string | null;
          item_type_id: string;
          created_at: string;
          updated_at: string;
        };
        // `discount_percent` is a generated column and `purchased_date` is
        // trigger-managed (synced from `purchased` — see DATABASE.md), so
        // neither is writable from the app.
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          image_url?: string | null;
          link?: string | null;
          price?: number | null;
          sale_price?: number | null;
          interest_level?: number | null;
          purchased?: boolean;
          gifted?: boolean;
          notes?: string | null;
          store_brand?: string | null;
          item_type_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Omit<Database["public"]["Tables"]["items"]["Insert"], "user_id">
        >;
        Relationships: [
          {
            foreignKeyName: "items_item_type_id_fkey";
            columns: ["item_type_id"];
            isOneToOne: false;
            referencedRelation: "item_types";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
