"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useParams, useRouter } from "next/navigation";
import {
  Heart,
  MessageCircle,
  Share,
  ExternalLink,
  Calendar,
  User,
  ArrowLeft,
  ThumbsUp,
  Clock,
  Eye,
} from "lucide-react";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string | null;
  author_name: string | null;
  is_published: boolean;
  published_at: string | null;
  facebook_post_id: string | null;
  facebook_permalink: string | null;
  facebook_likes_count: number;
  facebook_comments_count: number;
  facebook_shares_count: number;
  facebook_reactions: any;
  source: string;
  created_at: string;
}

export default function SingleBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchPost();
  }, [params.slug]);

  async function fetchPost() {
    setLoading(true);
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", params.slug)
      .eq("is_published", true)
      .single();

    setPost(data);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000109]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000109]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white">Post not found</h1>
          <button
            onClick={() => router.push("/blog")}
            className="mt-4 text-rose-400 hover:text-rose-300"
          >
            ← Back to blog
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000109]">
      {/* Cover Image */}
      {post.cover_image && (
        <div className="relative h-[400px] overflow-hidden">
          <img
            src={post.cover_image}
            alt={post.title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#000109] via-[#000109]/50 to-transparent" />
          <button
            onClick={() => router.push("/blog")}
            className="absolute left-6 top-6 flex items-center gap-2 rounded-xl bg-black/50 px-4 py-2 text-sm text-white backdrop-blur-sm transition-colors hover:bg-black/70"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
      )}

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        {!post.cover_image && (
          <button
            onClick={() => router.push("/blog")}
            className="mb-6 flex items-center gap-2 text-sm text-slate-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to blog
          </button>
        )}

        <div className="mb-6 flex items-center gap-3 text-sm text-slate-500">
          <span className="flex items-center gap-1">
            <User className="h-4 w-4" />
            {post.author_name || "Admin"}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {post.published_at
              ? new Date(post.published_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "Draft"}
          </span>
          {post.source === "facebook" && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-blue-400">
                <ExternalLink className="h-3.5 w-3.5" />
                From Facebook
              </span>
            </>
          )}
        </div>

        <h1 className="text-4xl font-bold text-white">{post.title}</h1>

        <p className="mt-4 text-xl text-slate-400">{post.excerpt}</p>

        <div className="mt-8 whitespace-pre-wrap text-lg leading-relaxed text-slate-300">
          {post.content}
        </div>

        {/* Engagement Footer */}
        {post.facebook_post_id && (
          <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
            <h3 className="mb-4 text-sm font-medium text-slate-400">
              Facebook Engagement
            </h3>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                  <ThumbsUp className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">
                    {post.facebook_likes_count || 0}
                  </p>
                  <p className="text-xs text-slate-500">Likes</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <MessageCircle className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">
                    {post.facebook_comments_count || 0}
                  </p>
                  <p className="text-xs text-slate-500">Comments</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                  <Share className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">
                    {post.facebook_shares_count || 0}
                  </p>
                  <p className="text-xs text-slate-500">Shares</p>
                </div>
              </div>
            </div>

            {post.facebook_permalink && (
              <a
                href={post.facebook_permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-all hover:bg-white/10"
              >
                <ExternalLink className="h-4 w-4" />
                View on Facebook
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}