import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qbnorzhkglizxskwsnfv.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-HX125LHFPy8CZclpXNnNw_m-2lc6A2";

export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {

        console.warn("Cannot set cookies in Server Component");
      },
      remove(name: string, options: CookieOptions) {

        console.warn("Cannot remove cookies in Server Component");
      },
    },
  });
}