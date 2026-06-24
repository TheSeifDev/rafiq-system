"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
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
  BookOpen,
  TrendingUp,
  Sparkles,
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
  source: string;
  created_at: string;
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setLoading(true);
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    setPosts(data || []);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#000109]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
      </div>
    );
  }

  const totalLikes = posts.reduce((sum, p) => sum + (p.facebook_likes_count || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.facebook_comments_count || 0), 0);
  const totalShares = posts.reduce((sum, p) => sum + (p.facebook_shares_count || 0), 0);

  return (
    <div className="min-h-screen bg-[#000109]">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-white/10 bg-white/[0.02] py-20">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <div className="absolute left-[-10%] top-[10%] h-[300px] w-[300px] rounded-full bg-rose-500/10 blur-[120px]" />
        <div className="absolute right-[-10%] bottom-[-10%] h-[250px] w-[250px] rounded-full bg-white/5 blur-[100px]" />

        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-1.5 text-xs font-medium text-rose-400">
            <Sparkles className="h-3.5 w-3.5" />
            Latest Stories
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight">
            Our <span className="text-rose-500">Blog</span>
          </h1>
          <p className="mt-4 text-lg text-slate-400 max-w-xl mx-auto">
            Insights, updates, and stories from our team
          </p>

          {/* Stats */}
          <div className="mt-8 flex items-center justify-center gap-6">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
              <BookOpen className="h-4 w-4 text-rose-400" />
              <span className="text-sm text-white font-medium">{posts.length}</span>
              <span className="text-xs text-slate-500">Posts</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
              <ThumbsUp className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-white font-medium">{totalLikes.toLocaleString()}</span>
              <span className="text-xs text-slate-500">Likes</span>
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2">
              <MessageCircle className="h-4 w-4 text-emerald-400" />
              <span className="text-sm text-white font-medium">{totalComments.toLocaleString()}</span>
              <span className="text-xs text-slate-500">Comments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="mx-auto max-w-4xl px-6 py-12">
        {posts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <p className="text-slate-400 text-lg">No posts yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {posts.map((post, index) => (
              <article
                key={post.id}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] transition-all duration-300 hover:border-rose-500/30 hover:bg-white/[0.04] hover:shadow-[0_0_40px_rgba(255,59,59,0.08)]"
              >
                {post.cover_image && (
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#000109] via-[#000109]/50 to-transparent" />

                    {/* Source badge */}
                    {post.source === "facebook" && (
                      <div className="absolute top-4 left-4 flex items-center gap-1.5 rounded-full bg-blue-500/20 backdrop-blur-md px-3 py-1 text-xs font-medium text-blue-400">
                        <ExternalLink className="h-3 w-3" />
                        From Facebook
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6">
                  {/* Meta info */}
                  <div className="mb-3 flex items-center gap-3 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500/10">
                        <User className="h-3 w-3 text-rose-400" />
                      </div>
                      {post.author_name || "Admin"}
                    </span>
                    <span className="text-slate-700">•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {post.published_at
                        ? new Date(post.published_at).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })
                        : "Draft"}
                    </span>
                  </div>

                  <h2 className="text-2xl font-bold text-white transition-colors group-hover:text-rose-400">
                    {post.title}
                  </h2>

                  <p className="mt-3 text-slate-400 leading-relaxed line-clamp-3">
                    {post.excerpt}
                  </p>

                  {/* Engagement */}
                  {post.facebook_post_id && (
                    <div className="mt-5 flex items-center gap-4 border-t border-white/5 pt-4">
                      <span className="flex items-center gap-1.5 text-sm text-blue-400">
                        <ThumbsUp className="h-4 w-4" />
                        {post.facebook_likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-emerald-400">
                        <MessageCircle className="h-4 w-4" />
                        {post.facebook_comments_count || 0}
                      </span>
                      <span className="flex items-center gap-1.5 text-sm text-amber-400">
                        <Share className="h-4 w-4" />
                        {post.facebook_shares_count || 0}
                      </span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-5 flex items-center justify-between">
                    <button
                      onClick={() => router.push(`/blog/${post.slug}`)}
                      className="group/btn inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-500/20 transition-all hover:shadow-rose-500/40 hover:scale-[1.02]"
                    >
                      Read more
                      <ArrowLeft className="h-4 w-4 rotate-180 transition-transform group-hover/btn:translate-x-0.5" />
                    </button>

                    {post.facebook_permalink && (
                      <a
                        href={post.facebook_permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm text-slate-500 transition-colors hover:text-blue-400"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        View on Facebook
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}