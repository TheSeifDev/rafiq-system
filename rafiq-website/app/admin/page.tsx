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
  Activity,
  Zap,
  Calendar,
  ChevronRight,
  BarChart3,
  ArrowUp,
  ArrowDown,
  MoreHorizontal,
} from "lucide-react";
import { Suspense } from "react";

// Loading Skeleton Component
function StatsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-lg bg-slate-800" />
            <div className="h-5 w-5 rounded bg-slate-800" />
          </div>
          <div className="mt-4 h-8 w-16 rounded bg-slate-800" />
          <div className="mt-2 h-4 w-24 rounded bg-slate-800" />
        </div>
      ))}
    </div>
  );
}

function QuickActionsSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse">
      <div className="mb-4 h-6 w-32 rounded bg-slate-800" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-slate-800" />
        ))}
      </div>
    </div>
  );
}

function RecentActivitySkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {[1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-6 w-32 rounded bg-slate-800" />
            <div className="h-4 w-16 rounded bg-slate-800" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-center gap-3 rounded-lg bg-slate-950/50 p-3">
                <div className="h-8 w-8 rounded-full bg-slate-800" />
                <div className="flex-1">
                  <div className="h-4 w-32 rounded bg-slate-800" />
                  <div className="mt-1 h-3 w-24 rounded bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Animated Counter Component
function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  return (
    <span className="tabular-nums">
      {value}
    </span>
  );
}

// Stat Card Component with hover effects
function StatCard({ stat }: { stat: any }) {
  const Icon = stat.icon;
  const trend = stat.trend || 0;
  const isPositive = trend >= 0;

  return (
    <Link
      href={stat.href}
      className={`group relative overflow-hidden rounded-xl border ${stat.borderColor} ${stat.bgColor} p-6 transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl`}
      style={{
        boxShadow: `0 0 0 ${stat.borderColor.replace("border-", "").replace("/20", "/0")}`,
      }}
    >
      {/* Background glow on hover */}
      <div 
        className={`absolute -bottom-8 -right-8 h-32 w-32 rounded-full ${stat.bgColor} blur-3xl transition-all duration-700 group-hover:scale-150 group-hover:opacity-60`}
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <div className={`rounded-xl ${stat.bgColor} p-3 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
            <Icon className={`h-6 w-6 ${stat.color}`} />
          </div>
          <div className="flex items-center gap-1">
            {trend !== 0 && (
              <span className={`flex items-center text-xs font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                {isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {Math.abs(trend)}%
              </span>
            )}
            <ArrowUpRight className="h-5 w-5 text-slate-600 transition-all duration-300 group-hover:text-white group-hover:translate-x-1 group-hover:-translate-y-1" />
          </div>
        </div>

        <div className="mt-5">
          <h3 className={`text-3xl font-bold ${stat.color} transition-all duration-500 group-hover:scale-105 origin-left`}>
            <AnimatedCounter value={stat.count} />
          </h3>
          <p className="mt-1.5 text-sm font-medium text-slate-400 transition-colors group-hover:text-slate-300">
            {stat.title}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/5">
          <div 
            className={`h-full rounded-full ${stat.color.replace("text-", "bg-")} transition-all duration-1000`}
            style={{ width: `${Math.min((stat.count / (stat.max || 100)) * 100, 100)}%` }}
          />
        </div>
      </div>
    </Link>
  );
}

// Quick Action Button
function QuickActionButton({ action }: { action: any }) {
  const Icon = action.icon;

  return (
    <Link
      href={action.href}
      className={`group relative flex items-center gap-3 overflow-hidden rounded-xl ${action.color} px-5 py-4 text-sm font-semibold text-white transition-all duration-500 hover:scale-[1.03] hover:shadow-xl hover:shadow-${action.shadowColor}-500/20`}
    >
      {/* Shine effect */}
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

      <div className="relative flex items-center gap-3">
        <div className="rounded-lg bg-white/20 p-2 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6">
          <Icon className="h-4 w-4" />
        </div>
        <span className="relative">{action.label}</span>
        <ChevronRight className="relative h-4 w-4 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
      </div>
    </Link>
  );
}

// Activity Item Component
function ActivityItem({ item, type }: { item: any; type: "review" | "post" }) {
  const isReview = type === "review";

  return (
    <div className="group flex items-center gap-4 rounded-xl border border-slate-800/50 bg-slate-950/30 p-4 transition-all duration-300 hover:border-slate-700/50 hover:bg-slate-900/50">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isReview ? "bg-rose-500/10" : "bg-emerald-500/10"} transition-transform duration-300 group-hover:scale-110`}>
        {isReview ? (
          <Users className="h-5 w-5 text-rose-400" />
        ) : (
          <FileText className="h-5 w-5 text-emerald-400" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white truncate transition-colors group-hover:text-slate-200">
          {isReview ? item.name : item.title}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">
          {isReview ? item.email : (item.is_published ? "Published" : "Draft")}
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {isReview && (
          <div className="flex items-center gap-1 rounded-lg bg-yellow-500/10 px-2 py-1">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            <span className="text-xs font-medium text-yellow-400">{item.rating}</span>
          </div>
        )}
        <span className="text-xs text-slate-600">
          {new Date(item.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}

async function DashboardContent() {
  const supabase = await createServerSupabaseClient();

  // Stats with error handling
  const [
    reviewsResult,
    blogResult,
    experienceResult,
    servicesResult,
  ] = await Promise.all([
    supabase.from("reviews").select("*", { count: "exact", head: true }),
    supabase.from("blog_posts").select("*", { count: "exact", head: true }),
    supabase.from("experiences").select("*", { count: "exact", head: true }),
    supabase.from("services").select("*", { count: "exact", head: true }),
  ]);

  const reviewsCount = reviewsResult.count || 0;
  const blogCount = blogResult.count || 0;
  const experienceCount = experienceResult.count || 0;
  const servicesCount = servicesResult.count || 0;

  // Recent data
  const [{ data: recentReviews }, { data: recentPosts }] = await Promise.all([
    supabase.from("reviews").select("*").order("created_at", { ascending: false }).limit(5),
    supabase.from("blog_posts").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  // Calculate trends (mock data - replace with real calculations)
  const stats = [
    {
      title: "Total Reviews",
      count: reviewsCount,
      href: "/admin/reviews",
      icon: MessageSquare,
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
      max: 50,
      trend: 12,
    },
    {
      title: "Blog Posts",
      count: blogCount,
      href: "/admin/blog",
      icon: FileText,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      max: 30,
      trend: 8,
    },
    {
      title: "Experience",
      count: experienceCount,
      href: "/admin/experience",
      icon: Briefcase,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      max: 20,
      trend: -3,
    },
    {
      title: "Services",
      count: servicesCount,
      href: "/admin/services",
      icon: Layers,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      max: 15,
      trend: 5,
    },
  ];

  const quickActions = [
    { 
      label: "New Blog Post", 
      href: "/admin/blog/new", 
      icon: FileText, 
      color: "bg-gradient-to-r from-emerald-600 to-emerald-500",
      shadowColor: "emerald",
    },
    { 
      label: "Add Experience", 
      href: "/admin/experience/new", 
      icon: Briefcase, 
      color: "bg-gradient-to-r from-blue-600 to-blue-500",
      shadowColor: "blue",
    },
    { 
      label: "Add Service", 
      href: "/admin/services/new", 
      icon: Layers, 
      color: "bg-gradient-to-r from-amber-600 to-amber-500",
      shadowColor: "amber",
    },
    { 
      label: "Upload Media", 
      href: "/admin/media", 
      icon: Plus, 
      color: "bg-gradient-to-r from-purple-600 to-purple-500",
      shadowColor: "purple",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="mt-1 text-slate-400">
            Welcome back! Here&apos;s what&apos;s happening with your website.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 px-4 py-2.5">
          <Calendar className="h-4 w-4 text-rose-400" />
          <span className="text-sm text-slate-400">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.title} stat={stat} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="rounded-lg bg-rose-500/10 p-2">
            <Zap className="h-5 w-5 text-rose-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Quick Actions</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <QuickActionButton key={action.label} action={action} />
          ))}
        </div>
      </div>

      {/* Activity Overview */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 backdrop-blur-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="rounded-lg bg-blue-500/10 p-2">
            <Activity className="h-5 w-5 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Activity Overview</h2>
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
            <BarChart3 className="h-4 w-4" />
            <span>Live updates</span>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Reviews */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-rose-400" />
                <h3 className="text-base font-semibold text-white">Recent Reviews</h3>
              </div>
              <Link 
                href="/admin/reviews" 
                className="group flex items-center gap-1 text-sm text-rose-400 transition-colors hover:text-rose-300"
              >
                View All
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentReviews && recentReviews.length > 0 ? (
                recentReviews.map((review) => (
                  <ActivityItem key={review.id} item={review} type="review" />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/30 py-12">
                  <MessageSquare className="h-10 w-10 text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500">No reviews yet</p>
                  <p className="text-xs text-slate-600 mt-1">Reviews will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Blog Posts */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-emerald-400" />
                <h3 className="text-base font-semibold text-white">Recent Blog Posts</h3>
              </div>
              <Link 
                href="/admin/blog" 
                className="group flex items-center gap-1 text-sm text-emerald-400 transition-colors hover:text-emerald-300"
              >
                View All
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentPosts && recentPosts.length > 0 ? (
                recentPosts.map((post) => (
                  <ActivityItem key={post.id} item={post} type="post" />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-950/30 py-12">
                  <FileText className="h-10 w-10 text-slate-700 mb-3" />
                  <p className="text-sm text-slate-500">No posts yet</p>
                  <p className="text-xs text-slate-600 mt-1">Blog posts will appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={
      <div className="space-y-8">
        <div className="h-8 w-48 rounded-lg bg-slate-800 animate-pulse" />
        <StatsSkeleton />
        <QuickActionsSkeleton />
        <RecentActivitySkeleton />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}