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
const VERIFY_TOKEN = process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN!;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully");
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("Facebook webhook received:", JSON.stringify(body, null, 2));

    if (!body.entry || !Array.isArray(body.entry)) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    for (const entry of body.entry) {
      if (!entry.changes) continue;

      for (const change of entry.changes) {
        if (change.field === "feed" && change.value) {
          await handleFeedChange(change.value);
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json({ success: true }, { status: 200 });
  }
}

async function handleFeedChange(value: any) {
  const { item, verb, post_id, message, created_time, from } = value;

  if (item !== "post" || verb !== "add") {
    return;
  }

  const { data: existingPost } = await supabaseAdmin
    .from("blog_posts")
    .select("id")
    .eq("facebook_post_id", post_id)
    .maybeSingle();

  if (existingPost) {
    console.log("Post already exists, skipping:", post_id);
    return;
  }

  try {
    const postDetails = await fetchFacebookPost(post_id);

    if (!postDetails.message) {
      console.log("No message in post, skipping:", post_id);
      return;
    }

    const lines = postDetails.message.split("\n").filter((l: string) => l.trim());
    const title = lines[0]?.substring(0, 100) || "Facebook Post";
    const content = postDetails.message;
    const excerpt = content.substring(0, 200) + (content.length > 200 ? "..." : "");

    const slug = `fb-${post_id}`;

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
          facebook_post_id: post_id,
          facebook_permalink: postDetails.permalink_url || null,
          source: "facebook",
          is_published: true,
          published_at: created_time
            ? new Date(created_time * 1000).toISOString()
            : new Date().toISOString(),
          author_name: from?.name || "Facebook Page",
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error("Failed to save Facebook post:", insertError);
    } else {
      console.log("Facebook post saved to blog:", newPost.id);
    }
  } catch (error) {
    console.error("Error processing Facebook post:", error);
  }
}

async function fetchFacebookPost(postId: string) {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${postId}?fields=id,message,created_time,permalink_url,full_picture,attachments{media,subattachments}&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch post: ${response.statusText}`);
  }

  return await response.json();
}