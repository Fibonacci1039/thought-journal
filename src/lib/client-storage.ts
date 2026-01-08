import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Lazy initialization to handle SSR gracefully
let supabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase の環境変数が設定されていません (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)"
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  return supabaseClient;
}

export async function uploadImage(file: File): Promise<string> {
  const supabase = getSupabaseClient();

  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}_${Math.random()
    .toString(36)
    .substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error } = await supabase.storage
    .from("entry_images")
    .upload(filePath, file);

  if (error) {
    console.error("Image upload error:", error);
    throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
  }

  const { data } = supabase.storage.from("entry_images").getPublicUrl(filePath);
  return data.publicUrl;
}
