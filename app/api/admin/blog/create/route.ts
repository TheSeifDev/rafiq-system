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

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 100);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      excerpt,
      cover_image,
      author_name,
      is_published = false,
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: "Title and content are required" },
        { status: 400 }
      );
    }

    const slug = generateSlug(title);
    const publishedAt = is_published ? new Date().toISOString() : null;

    const { data: blogPost, error: dbError } = await supabaseAdmin
      .from("blog_posts")
      .insert([
        {
          title,
          slug,
          content,
          excerpt: excerpt || content.substring(0, 200) + "...",
          cover_image,
          author_name: author_name || "Admin",
          is_published,
          published_at: publishedAt,
          source: "dashboard",
        },
      ])
      .select()
      .single();

    if (dbError) {
          
      if (dbError.code === "23505") {
        return NextResponse.json(
          { success: false, error: "A post with this title already exists" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { success: false, error: dbError.message },
        { status: 500 }
      );
    }

    let facebookPostId = null;
    let facebookPermalink = null;

    if (is_published) {
      try {
        const fbResponse = await postToFacebook({
          title,
          content,
          excerpt: excerpt || content.substring(0, 200) + "...",
          cover_image,
          slug,
        });

        facebookPostId = fbResponse.id;
        facebookPermalink = fbResponse.permalink_url || null;

        await supabaseAdmin
          .from("blog_posts")
          .update({
            facebook_post_id: facebookPostId,
            facebook_permalink: facebookPermalink,
          })
          .eq("id", blogPost.id);
      } catch (fbError: any) {
        console.error("Facebook post failed:", fbError);
      }
    }

    return NextResponse.json({
      success: true,
      post: {
        ...blogPost,
        facebook_post_id: facebookPostId,
        facebook_permalink: facebookPermalink,
      },
    });
  } catch (error: any) {
    console.error("Create post error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}


async function postToFacebook({
  title,
  content,
  excerpt,
  cover_image,
  slug,
}: {
  title: string;
  content: string;
  excerpt: string;
  cover_image?: string;
  slug: string;
}) {
  const blogUrl = `${process.env.NEXT_PUBLIC_APP_URL}/blog/${slug}`;
  const message = `${title}\n\n${excerpt}\n\nRead more: ${blogUrl}`;

  let fbPostData: any = {
    message,
    link: blogUrl,
  };


  if (cover_image) {
    fbPostData = {
      message: `${title}\n\n${excerpt}`,
      link: blogUrl,
    };
  }

  const response = await fetch(
    `https://graph.facebook.com/v22.0/${FACEBOOK_PAGE_ID}/feed`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...fbPostData,
        access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error?.message || "Facebook API error");
  }

  // Get permalink
  const permalinkRes = await fetch(
    `https://graph.facebook.com/v22.0/${data.id}?fields=permalink_url&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`
  );
  const permalinkData = await permalinkRes.json();

  return {
    id: data.id,
    permalink_url: permalinkData.permalink_url || null,
  };
} 