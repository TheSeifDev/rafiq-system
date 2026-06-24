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
const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID!;

export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const syncEngagement = searchParams.get("engagement") === "true";

    // 1. Sync page info
    await syncPageInfo();

    // 2. Sync posts with engagement
    const result = await syncPosts(limit, syncEngagement);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

async function syncPageInfo() {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v22.0/${FACEBOOK_PAGE_ID}?fields=id,name,fan_count,followers_count,picture,category,link&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
    );

    const data = await response.json();
    if (!response.ok) return;

    await supabaseAdmin
      .from("facebook_page_info")
      .upsert(
        {
          page_id: data.id,
          page_name: data.name,
          page_likes: data.fan_count || 0,
          page_followers: data.followers_count || 0,
          page_picture: data.picture?.data?.url || null,
          page_category: data.category || null,
          page_link: data.link || null,
          last_synced: new Date().toISOString(),
        },
        { onConflict: "page_id" }
      );
  } catch (error) {
    console.error("Page info sync failed:", error);
  }
}

async function syncPosts(limit: number, syncEngagement: boolean) {
  const fields = syncEngagement
    ? "id,message,created_time,permalink_url,full_picture,likes.summary(true),comments.summary(true),shares,reactions.summary(true)"
    : "id,message,created_time,permalink_url,full_picture";

  const fbResponse = await fetch(
    `https://graph.facebook.com/v22.0/${FACEBOOK_PAGE_ID}/posts?fields=${fields}&limit=${limit}&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
  );

  const fbData = await fbResponse.json();

  if (!fbResponse.ok) {
    throw new Error(fbData.error?.message || "Facebook API error");
  }

  const posts = fbData.data || [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const fbPost of posts) {
    const engagement = syncEngagement ? extractEngagement(fbPost) : null;

    // Check if post exists
    const { data: existing } = await supabaseAdmin
      .from("blog_posts")
      .select("id,facebook_post_id")
      .eq("facebook_post_id", fbPost.id)
      .maybeSingle();

    if (existing) {
      // Update engagement only
      if (syncEngagement && engagement) {
        await updateEngagement(existing.id, fbPost.id, engagement);
        updated++;
      } else {
        skipped++;
      }
      continue;
    }

    if (!fbPost.message) {
      skipped++;
      continue;
    }

    const lines = fbPost.message.split("\n").filter((l: string) => l.trim());
    const title = lines[0]?.substring(0, 100) || "Facebook Post";
    const content = fbPost.message;
    const excerpt = content.substring(0, 200) + (content.length > 200 ? "..." : "");
    const slug = `fb-${fbPost.id}`;

    const { data: slugExists } = await supabaseAdmin
      .from("blog_posts")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

    const { data: newPost, error: insertError } = await supabaseAdmin
      .from("blog_posts")
      .insert([
        {
          title,
          slug: finalSlug,
          content,
          excerpt,
          cover_image: fbPost.full_picture || null,
          facebook_post_id: fbPost.id,
          facebook_permalink: fbPost.permalink_url || null,
          facebook_likes_count: engagement?.likes || 0,
          facebook_comments_count: engagement?.comments || 0,
          facebook_shares_count: engagement?.shares || 0,
          facebook_reactions: engagement?.reactions || null,
          facebook_last_synced: new Date().toISOString(),
          source: "facebook",
          is_published: true,
          published_at: fbPost.created_time
            ? new Date(fbPost.created_time).toISOString()
            : new Date().toISOString(),
          author_name: "Facebook Page",
        },
      ])
      .select()
      .single();

    if (!insertError && newPost) {
      imported++;
      // Record engagement history
      if (engagement) {
        await recordEngagementHistory(fbPost.id, engagement);
      }
    }
  }

  return { imported, updated, skipped, total: posts.length };
}

function extractEngagement(fbPost: any) {
  return {
    likes: fbPost.likes?.summary?.total_count || 0,
    comments: fbPost.comments?.summary?.total_count || 0,
    shares: fbPost.shares?.count || 0,
    reactions: fbPost.reactions?.summary?.total_count
      ? { total: fbPost.reactions.summary.total_count }
      : null,
  };
}

async function updateEngagement(postId: string, fbPostId: string, engagement: any) {
  await supabaseAdmin
    .from("blog_posts")
    .update({
      facebook_likes_count: engagement.likes,
      facebook_comments_count: engagement.comments,
      facebook_shares_count: engagement.shares,
      facebook_reactions: engagement.reactions,
      facebook_last_synced: new Date().toISOString(),
    })
    .eq("id", postId);

  await recordEngagementHistory(fbPostId, engagement);
}

async function recordEngagementHistory(fbPostId: string, engagement: any) {
  await supabaseAdmin.from("facebook_engagement_history").insert([
    {
      facebook_post_id: fbPostId,
      likes_count: engagement.likes,
      comments_count: engagement.comments,
      shares_count: engagement.shares,
      reactions: engagement.reactions,
    },
  ]);
}