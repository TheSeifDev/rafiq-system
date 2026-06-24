"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import {
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  Image as ImageIcon,
  Save,
  X,
  Globe,
  Share2,
  Heart,
  MessageCircle,
  Share,
  ThumbsUp,
  TrendingUp,
  Users,
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
  facebook_last_synced: string | null;
  source: string;
  created_at: string;
}

interface PageInfo {
  page_name: string;
  page_likes: number;
  page_followers: number;
  page_picture: string | null;
  page_link: string | null;
}

export default function BlogManager() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncingEngagement, setSyncingEngagement] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    excerpt: "",
    cover_image: "",
    author_name: "",
    is_published: false,
  });

  useEffect(() => {
    fetchPosts();
    fetchPageInfo();

    const channel = supabase
      .channel("blog_posts_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "blog_posts" },
        () => fetchPosts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchPosts() {
    setLoading(true);
    const { data } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });

    setPosts(data || []);
    setLoading(false);
  }

  async function fetchPageInfo() {
    try {
      const response = await fetch("/api/facebook/page-info");
      if (!response.ok) {
        setPageInfo(null);
        return;
      }
      const result = await response.json();
      if (result.success) {
        setPageInfo(result.data);
      } else {
        setPageInfo(null);
      }
    } catch {
      setPageInfo(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const url = editingPost ? "/api/blog/update" : "/api/blog/create";
    const body = editingPost
      ? { ...formData, id: editingPost.id }
      : formData;

    const response = await fetch(url, {
      method: editingPost ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (result.success) {
      setShowForm(false);
      setEditingPost(null);
      resetForm();
      fetchPosts();
    } else {
      alert(result.error || "Something went wrong");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;

    const response = await fetch(`/api/blog/delete?id=${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      fetchPosts();
    } else {
      alert(result.error || "Failed to delete");
    }
  }

  async function handleSync() {
    setSyncing(true);
    try {
      const response = await fetch("/api/facebook/sync?limit=50&engagement=true", {
        method: "POST",
      });
      if (!response.ok) {
        alert("Sync endpoint not found. Please configure Facebook integration.");
        return;
      }
      const result = await response.json();

      if (result.success) {
        alert(
          `Synced! Imported: ${result.imported}, Updated: ${result.updated}, Skipped: ${result.skipped}`
        );
        fetchPosts();
        fetchPageInfo();
      } else {
        alert(result.error || "Sync failed");
      }
    } catch {
      alert("Sync endpoint not found. Please configure Facebook integration.");
    } finally {
      setSyncing(false);
    }
  }

  async function syncEngagement(post: BlogPost) {
    if (!post.facebook_post_id) return;

    setSyncingEngagement(true);
    try {
      const response = await fetch(
        `/api/facebook/engagement?post_id=${post.facebook_post_id}`
      );
      if (!response.ok) return;
      const result = await response.json();

      if (result.success) {
        fetchPosts();
      }
    } catch {
      // silently ignore
    } finally {
      setSyncingEngagement(false);
    }
  }

  function resetForm() {
    setFormData({
      title: "",
      content: "",
      excerpt: "",
      cover_image: "",
      author_name: "",
      is_published: false,
    });
  }

  function startEdit(post: BlogPost) {
    setEditingPost(post);
    setFormData({
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || "",
      cover_image: post.cover_image || "",
      author_name: post.author_name || "",
      is_published: post.is_published || false,
    });
    setShowForm(true);
  }

  const totalLikes = posts.reduce((sum, p) => sum + (p.facebook_likes_count || 0), 0);
  const totalComments = posts.reduce((sum, p) => sum + (p.facebook_comments_count || 0), 0);
  const totalShares = posts.reduce((sum, p) => sum + (p.facebook_shares_count || 0), 0);

  return (
    <div className="min-h-screen bg-[#000109] p-6">
      <div className="mx-auto max-w-7xl">
        {/* Page Info Header */}
        {pageInfo && (
          <div className="mb-6 rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {pageInfo.page_picture && (
                  <img
                    src={pageInfo.page_picture}
                    alt={pageInfo.page_name}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                )}
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {pageInfo.page_name}
                  </h2>
                  <div className="mt-1 flex items-center gap-4 text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5" />
                      {pageInfo.page_likes.toLocaleString()} likes
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {pageInfo.page_followers.toLocaleString()} followers
                    </span>
                  </div>
                </div>
              </div>
              {pageInfo.page_link && (
                <a
                  href={pageInfo.page_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition-all hover:bg-white/10"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Page
                </a>
              )}
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
                <TrendingUp className="h-5 w-5 text-rose-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{posts.length}</p>
                <p className="text-xs text-slate-400">Total Posts</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <Heart className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {totalLikes.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">Total Likes</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <MessageCircle className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {totalComments.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">Total Comments</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Share className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">
                  {totalShares.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400">Total Shares</p>
              </div>
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Blog Manager</h1>
            <p className="mt-1 text-sm text-slate-400">
              Full Facebook page control center
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/10 disabled:opacity-50"
            >
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Sync All
            </button>
            <button
              onClick={() => {
                setEditingPost(null);
                resetForm();
                setShowForm(!showForm);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-500/25 transition-all hover:shadow-rose-500/40"
            >
              <Plus className="h-4 w-4" />
              New Post
            </button>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                {editingPost ? "Edit Post" : "Create New Post"}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-1 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/20"
                    placeholder="Post title..."
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Author
                  </label>
                  <input
                    type="text"
                    value={formData.author_name}
                    onChange={(e) =>
                      setFormData({ ...formData, author_name: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/20"
                    placeholder="Author name..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Cover Image URL
                </label>
                <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="url"
                    value={formData.cover_image}
                    onChange={(e) =>
                      setFormData({ ...formData, cover_image: e.target.value })
                    }
                    className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/20"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Excerpt
                </label>
                <textarea
                  value={formData.excerpt}
                  onChange={(e) =>
                    setFormData({ ...formData, excerpt: e.target.value })
                  }
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/20"
                  placeholder="Short summary..."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Content
                </label>
                <textarea
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  rows={8}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rose-500/50 focus:outline-none focus:ring-1 focus:ring-rose-500/20"
                  placeholder="Write your post content..."
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_published"
                  checked={formData.is_published}
                  onChange={(e) =>
                    setFormData({ ...formData, is_published: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-rose-500 focus:ring-rose-500/20"
                />
                <label htmlFor="is_published" className="text-sm text-slate-300">
                  Publish immediately (will also post to Facebook)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-500/25 transition-all hover:shadow-rose-500/40"
                >
                  <Save className="h-4 w-4" />
                  {editingPost ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Posts List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
            <p className="text-slate-400">No posts yet. Create your first post!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl transition-all hover:border-white/20"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    {/* Tags */}
                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                      {post.source === "facebook" && (
                        <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400">
                          <Globe className="h-3 w-3" />
                          Facebook
                        </span>
                      )}
                      {post.is_published ? (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                          <Eye className="h-3 w-3" />
                          Published
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 rounded-full bg-slate-500/10 px-2 py-0.5 text-xs font-medium text-slate-400">
                          <EyeOff className="h-3 w-3" />
                          Draft
                        </span>
                      )}
                      {post.facebook_post_id && (
                        <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-400">
                          <Share2 className="h-3 w-3" />
                          Synced
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-semibold text-white">
                      {post.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-400 line-clamp-2">
                      {post.excerpt}
                    </p>

                    {/* Engagement Stats */}
                    {post.facebook_post_id && (
                      <div className="mt-3 flex items-center gap-4">
                        <span className="flex items-center gap-1 rounded-lg bg-blue-500/10 px-2 py-1 text-xs text-blue-400">
                          <ThumbsUp className="h-3 w-3" />
                          {post.facebook_likes_count || 0}
                        </span>
                        <span className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                          <MessageCircle className="h-3 w-3" />
                          {post.facebook_comments_count || 0}
                        </span>
                        <span className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
                          <Share className="h-3 w-3" />
                          {post.facebook_shares_count || 0}
                        </span>
                        {post.facebook_last_synced && (
                          <span className="text-xs text-slate-500">
                            Synced{" "}
                            {new Date(post.facebook_last_synced).toLocaleTimeString(
                              "en-US",
                              { hour: "2-digit", minute: "2-digit" }
                            )}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span>{post.author_name || "Admin"}</span>
                      <span>•</span>
                      <span>
                        {new Date(post.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {post.published_at && (
                        <>
                          <span>•</span>
                          <span>
                            Published{" "}
                            {new Date(post.published_at).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              }
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {post.facebook_post_id && (
                      <button
                        onClick={() => syncEngagement(post)}
                        disabled={syncingEngagement}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                        title="Sync engagement"
                      >
                        <RefreshCw
                          className={`h-4 w-4 ${
                            syncingEngagement ? "animate-spin" : ""
                          }`}
                        />
                      </button>
                    )}
                    {post.facebook_permalink && (
                      <a
                        href={post.facebook_permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                        title="View on Facebook"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => startEdit(post)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}