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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      content,
      excerpt,
      cover_image,
      author_name,
      is_published,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Post ID is required" },
        { status: 400 }
      );
    }

    // Get existing post
    const { data: existingPost } = await supabaseAdmin
      .from("blog_posts")
      .select("*")
      .eq("id", id)
      .single();

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: "Post not found" },
        { status: 404 }
      );
    }

    const updates: any = {
      title,
      content,
      excerpt: excerpt || content?.substring(0, 200) + "...",
      cover_image,
      author_name,
      updated_at: new Date().toISOString(),
    };

    if (is_published !== undefined && is_published !== existingPost.is_published) {
      updates.is_published = is_published;
      updates.published_at = is_published ? new Date().toISOString() : null;

      if (is_published && !existingPost.is_published && !existingPost.facebook_post_id) {
        try {
          const blogUrl = `${process.env.NEXT_PUBLIC_APP_URL}/blog/${existingPost.slug}`;
          const fbResponse = await fetch(
            `https://graph.facebook.com/v22.0/${process.env.FACEBOOK_PAGE_ID}/feed`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                message: `${title}\n\n${updates.excerpt}\n\nRead more: ${blogUrl}`,
                link: blogUrl,
                access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
              }),
            }
          );

          const fbData = await fbResponse.json();
          if (fbResponse.ok) {
            updates.facebook_post_id = fbData.id;

            const permalinkRes = await fetch(
              `https://graph.facebook.com/v22.0/${fbData.id}?fields=permalink_url&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
            );
            const permalinkData = await permalinkRes.json();
            updates.facebook_permalink = permalinkData.permalink_url || null;
          }
        } catch (fbError) {
          console.error("Facebook post failed on publish:", fbError);
        }
      }
    }


    const { data: updatedPost, error: dbError } = await supabaseAdmin
      .from("blog_posts")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (dbError) {
      return NextResponse.json(
        { success: false, error: dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      post: updatedPost,
    });
  } catch (error: any) {
    console.error("Update post error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}