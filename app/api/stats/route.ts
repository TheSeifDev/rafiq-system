import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function GET() {
  try {
    const { count: teamCount } = await supabaseAdmin
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("is_active", true);

    const { count: softCount } = await supabaseAdmin
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("skill_type", "soft")
      .eq("is_active", true);

    const { count: hardCount } = await supabaseAdmin
      .from("team_members")
      .select("*", { count: "exact", head: true })
      .eq("skill_type", "hard")
      .eq("is_active", true);

    const { data: aboutData } = await supabaseAdmin
      .from("about_content")
      .select("stats")
      .eq("section", "hero")
      .single();

    return NextResponse.json({
      success: true,
      stats: {
        totalTeam: teamCount || 0,
        softSkills: softCount || 0,
        hardSkills: hardCount || 0,
        projects: aboutData?.stats?.projects || 15,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}