'use client';

import { useState, useEffect, useCallback } from 'react';
import { Review } from '@/src/types/database';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Pin, 
  PinOff, 
  Trash2, 
  Star,
  Loader2,
  MessageSquare,
  Filter,
  ThumbsUp,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);

      const response = await fetch(`/api/admin/reviews?${params}`);
      const result = await response.json();

      if (result.success) {
        setReviews(result.data);
      } else {
        toast.error('Failed to load reviews');
      }
    } catch (error) {
      toast.error('Error fetching reviews');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const updateReview = async (id: string, data: Partial<Review>) => {
    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Review updated successfully');
        fetchReviews();
      } else {
        toast.error(result.error || 'Failed to update review');
      }
    } catch (error) {
      toast.error('Error updating review');
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const response = await fetch(`/api/admin/reviews?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Review deleted');
        fetchReviews();
      } else {
        toast.error(result.error || 'Failed to delete review');
      }
    } catch (error) {
      toast.error('Error deleting review');
    }
  };

  // Stats
  const approvedCount = reviews.filter((r: Review) => r.is_approved).length;
  const pendingCount = reviews.filter((r: Review) => !r.is_approved).length;
  const pinnedCount = reviews.filter((r: Review) => r.is_pinned).length;
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc: number, r: Review) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : '0';

  const stats = [
    {
      label: 'Total Reviews',
      value: reviews.length,
      icon: MessageSquare,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Approved',
      value: approvedCount,
      icon: ThumbsUp,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Pending',
      value: pendingCount,
      icon: Clock,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Avg Rating',
      value: avgRating,
      icon: Star,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
    },
  ];

  const columns: ColumnDef<Review>[] = [
    {
      accessorKey: 'name',
      header: 'Reviewer',
      cell: ({ row }: { row: { original: Review } }) => (
        <div className="flex flex-col">
          <span className="font-medium text-white">{row.original.name}</span>
          <span className="text-sm text-slate-400">{row.original.email}</span>
        </div>
      ),
    },
    {
      accessorKey: 'rating',
      header: 'Rating',
      cell: ({ row }: { row: { original: Review } }) => (
        <div className="flex items-center gap-1">
          <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
          <span className="text-white font-medium">{row.original.rating}/5</span>
        </div>
      ),
    },
    {
      accessorKey: 'content',
      header: 'Review Content',
      cell: ({ row }: { row: { original: Review } }) => (
        <p className="max-w-md truncate text-slate-300" title={row.original.content}>
          {row.original.content}
        </p>
      ),
    },
    {
      accessorKey: 'is_approved',
      header: 'Status',
      cell: ({ row }: { row: { original: Review } }) => (
        <Badge 
          variant={row.original.is_approved ? 'default' : 'secondary'}
          className={row.original.is_approved 
            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' 
            : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
          }
        >
          {row.original.is_approved ? 'Approved' : 'Pending'}
        </Badge>
      ),
    },
    {
      accessorKey: 'is_pinned',
      header: 'Pinned',
      cell: ({ row }: { row: { original: Review } }) => (
        <Badge 
          variant={row.original.is_pinned ? 'default' : 'outline'}
          className={row.original.is_pinned 
            ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30' 
            : 'text-slate-400 border-slate-700'
          }
        >
          {row.original.is_pinned ? 'Pinned' : 'Not Pinned'}
        </Badge>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Date',
      cell: ({ row }: { row: { original: Review } }) => (
        <span className="text-slate-400 text-sm">
          {new Date(row.original.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }: { row: { original: Review } }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateReview(row.original.id, { 
              is_approved: !row.original.is_approved 
            })}
            title={row.original.is_approved ? 'Reject' : 'Approve'}
            className={row.original.is_approved 
              ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10' 
              : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
            }
          >
            {row.original.is_approved ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => updateReview(row.original.id, { 
              is_pinned: !row.original.is_pinned 
            })}
            title={row.original.is_pinned ? 'Unpin' : 'Pin'}
            className={row.original.is_pinned 
              ? 'text-rose-400 hover:text-rose-300 hover:bg-rose-500/10' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }
          >
            {row.original.is_pinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteReview(row.original.id)}
            title="Delete"
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-56 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-40 bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-48 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Reviews Management</h1>
          <p className="mt-1 text-slate-400">
            Manage and moderate customer reviews
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          {(['all', 'pending', 'approved'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f)}
              className={filter === f 
                ? 'bg-rose-600 hover:bg-rose-700 text-white' 
                : 'border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
              }
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-xl border border-slate-800 ${stat.bgColor} p-4`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg ${stat.bgColor} p-2 border border-slate-700/50`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Data Table */}
      <DataTable 
        columns={columns} 
        data={reviews}
        searchKey="name"
      />
    </div>
  );
}