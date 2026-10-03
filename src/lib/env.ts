export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  functionsUrl:
    process.env.NEXT_PUBLIC_FUNCTIONS_URL ?? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`,
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};
