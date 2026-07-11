import { dataProvider as refineSupabaseProvider } from "@refinedev/supabase";
import { supabase } from "@/integrations/supabase/client";

export const refineDataProvider = refineSupabaseProvider(supabase);
