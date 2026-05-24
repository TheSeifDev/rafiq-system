import { createServerSupabaseClient } from "@/lib/server";
import Link from "next/link";
import {
  MessageSquare,
  FileText,
  Briefcase,
  Layers,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Users,
  Star,
  Eye,
  Plus,
} from "lucide-react";

export default async function AdminDashboardPage() {
  const supabase = await createServerSupabaseClient();

  // Stats
  const [
    { count: reviewsCount },
    { count: blogCount },
    { count: experienceCount },
    { count: servicesCount },
  ] = await Promise.all([
    supabase.from("reviews").select("*", { count: "exact", head: true }),
    supabase.from("blog_posts").select("*", { count: "exact", head: true }),
    supabase.from("experiences").select("*", { count: "exact", head: true }),
    supabase.from("services").select("*", { count: "exact", head: true }),
  ]);

  // Recent Reviews
  const { data: recentReviews } = await supabase
    .from("reviews")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent Blog Posts
  const { data: recentPosts } = await supabase
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    {
      title: "Reviews",
      count: reviewsCount || 0,
      href: "/admin/reviews",
      icon: MessageSquare,
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
    },
    {
      title: "Blog Posts",
      count: blogCount || 0,
      href: "/admin/blog",
      icon: FileText,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
    },
    {
      title: "Experience",
      count: experienceCount || 0,
      href: "/admin/experience",
      icon: Briefcase,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
    },
    {
      title: "Services",
      count: servicesCount || 0,
      href: "/admin/services",
      icon: Layers,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
    },
  ];

  const quickActions = [
    { label: "New Blog Post", href: "/admin/blog/new", icon: FileText, color: "bg-emerald-600 hover:bg-emerald-700" },
    { label: "Add Experience", href: "/admin/experience/new", icon: Briefcase, color: "bg-blue-600 hover:bg-blue-700" },
    { label: "Add Service", href: "/admin/services/new", icon: Layers, color: "bg-amber-600 hover:bg-amber-700" },
    { label: "Upload Media", href: "/admin/media", icon: Plus, color: "bg-purple-600 hover:bg-purple-700" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-slate-400">Welcome back! Here's what's happening with your website.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock className="h-4 w-4" />
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.title}
              href={stat.href}
              className={`group relative overflow-hidden rounded-xl border ${stat.borderColor} ${stat.bgColor} p-6 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-${stat.color.split("-")[1]}-500/10`}
            >
              <div className="flex items-center justify-between">
                <div className={`rounded-lg ${stat.bgColor} p-3`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-600 transition-colors group-hover:text-white" />
              </div>
              <div className="mt-4">
                <h3 className={`text-3xl font-bold ${stat.color}`}>{stat.count}</h3>
                <p className="mt-1 text-sm font-medium text-slate-400 group-hover:text-slate-300">
                  {stat.title}
                </p>
              </div>
              <div className="absolute -bottom-2 -right-2 h-24 w-24 rounded-full bg-white/5 blur-2xl transition-all group-hover:bg-white/10" />
            </Link>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-rose-400" />
          <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className={`flex items-center gap-3 rounded-lg ${action.color} px-4 py-3 text-sm font-medium text-white transition-all hover:scale-[1.02]`}
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Reviews */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-rose-400" />
              <h2 className="text-lg font-semibold text-white">Recent Reviews</h2>
            </div>
            <Link href="/admin/reviews" className="text-sm text-rose-400 hover:text-rose-300">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentReviews && recentReviews.length > 0 ? (
              recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-950/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10">
                      <Users className="h-4 w-4 text-rose-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{review.name}</p>
                      <p className="text-xs text-slate-500">{review.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                    <span className="text-sm text-slate-400">{review.rating}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No reviews yet</p>
            )}
          </div>
        </div>

        {/* Recent Blog Posts */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-emerald-400" />
              <h2 className="text-lg font-semibold text-white">Recent Blog Posts</h2>
            </div>
            <Link href="/admin/blog" className="text-sm text-emerald-400 hover:text-emerald-300">
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {recentPosts && recentPosts.length > 0 ? (
              recentPosts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800/50 bg-slate-950/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10">
                      <FileText className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white line-clamp-1">{post.title}</p>
                      <p className="text-xs text-slate-500">
                        {post.is_published ? "Published" : "Draft"}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(post.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No posts yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}