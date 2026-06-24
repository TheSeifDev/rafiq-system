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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get("post_id");

    if (!postId) {
      return NextResponse.json(
        { success: false, error: "post_id is required" },
        { status: 400 }
      );
    }

    // Fetch fresh engagement from Facebook
    const fbResponse = await fetch(
      `https://graph.facebook.com/v22.0/${postId}?fields=likes.summary(true),comments.summary(true),shares,reactions.summary(true)&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
    );

    const fbData = await fbResponse.json();

    if (!fbResponse.ok) {
      return NextResponse.json(
        { success: false, error: fbData.error?.message },
        { status: 500 }
      );
    }

    const engagement = {
      likes: fbData.likes?.summary?.total_count || 0,
      comments: fbData.comments?.summary?.total_count || 0,
      shares: fbData.shares?.count || 0,
      reactions: fbData.reactions?.summary?.total_count || 0,
    };

    // Update in database
    await supabaseAdmin
      .from("blog_posts")
      .update({
        facebook_likes_count: engagement.likes,
        facebook_comments_count: engagement.comments,
        facebook_shares_count: engagement.shares,
        facebook_reactions: { total: engagement.reactions },
        facebook_last_synced: new Date().toISOString(),
      })
      .eq("facebook_post_id", postId);

    // Record history
    await supabaseAdmin.from("facebook_engagement_history").insert([
      {
        facebook_post_id: postId,
        likes_count: engagement.likes,
        comments_count: engagement.comments,
        shares_count: engagement.shares,
        reactions: { total: engagement.reactions },
      },
    ]);

    return NextResponse.json({
      success: true,
      engagement,
    });
  } catch (error: any) {
    console.error("Engagement fetch error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}