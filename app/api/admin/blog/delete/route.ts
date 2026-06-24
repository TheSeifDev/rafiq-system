import { NextRequest, NextResponse } from "next/server";
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

const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Post ID is required" },
        { status: 400 }
      );
    }

    const { data: post } = await supabaseAdmin
      .from("blog_posts")
      .select("facebook_post_id")
      .eq("id", id)
      .single();


    if (post?.facebook_post_id) {
      try {
        await fetch(
          `https://graph.facebook.com/v22.0/${post.facebook_post_id}?access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`,
          { method: "DELETE" }
        );
      } catch (fbError) {
        console.error("Failed to delete Facebook post:", fbError);
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from("blog_posts")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete post error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}