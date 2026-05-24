import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qbnorzhkglizxskwsnfv.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-HX125LHFPy8CZclpXNnNw_m-2lc6A2";


const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 401 });
    }

    if (!data.session) {
      return NextResponse.json({ success: false, error: "No session" }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      token: data.session.access_token,
      user: data.user,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}