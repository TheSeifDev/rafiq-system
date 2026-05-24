'use client';

import { useState, useEffect, useCallback } from 'react';
import { BlogPost } from '@/src/types/database';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Pencil,
  Trash2,
  Eye,
  Plus,
  Loader2,
  Calendar,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import Image from 'next/image';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('status', filter);

      const response = await fetch(`/api/admin/blog?${params}`);
      const result = await response.json();

      if (result.success) {
        setPosts(result.data);
      } else {
        toast.error('Failed to load blog posts');
      }
    } catch (error) {
      toast.error('Error fetching blog posts');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const deletePost = async (id: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/admin/blog?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Post deleted successfully');
        fetchPosts();
      } else {
        toast.error(result.error || 'Failed to delete post');
      }
    } catch (error) {
      toast.error('Error deleting post');
    }
  };

  const togglePublish = async (post: BlogPost) => {
    try {
      const response = await fetch('/api/admin/blog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: post.id,
          is_published: !post.is_published,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(
          post.is_published ? 'Post unpublished' : 'Post published'
        );
        fetchPosts();
      } else {
        toast.error(result.error || 'Failed to update post');
      }
    } catch (error) {
      toast.error('Error updating post');
    }
  };

  const columns: ColumnDef<BlogPost>[] = [
    {
      accessorKey: 'title',
      header: 'Post',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
            {row.original.cover_image ? (
              <Image
                src={row.original.cover_image}
                alt={row.original.title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-500">
                <Eye className="h-4 w-4" />
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-white max-w-[200px] truncate">
              {row.original.title}
            </span>
            <span className="text-xs text-slate-500">/{row.original.slug}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'author_name',
      header: 'Author',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-slate-300">
          <User className="h-3.5 w-3.5 text-slate-500" />
          {row.original.author_name || 'Unknown'}
        </div>
      ),
    },
    {
      accessorKey: 'is_published',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.is_published ? 'default' : 'secondary'}
          className={
            row.original.is_published
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }
        >
          {row.original.is_published ? 'Published' : 'Draft'}
        </Badge>
      ),
    },
    {
      accessorKey: 'published_at',
      header: 'Date',
      cell: ({ row }) => (
        <div className="flex items-center gap-2 text-slate-400">
          <Calendar className="h-3.5 w-3.5" />
          {row.original.published_at
            ? new Date(row.original.published_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
            : 'Not published'}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => togglePublish(row.original)}
            className={
              row.original.is_published
                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
            }
          >
            {row.original.is_published ? 'Unpublish' : 'Publish'}
          </Button>

          <Link href={`/admin/blog/edit/${row.original.id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => deletePost(row.original.id)}
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
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Blog Posts</h1>
          <p className="mt-1 text-slate-400">
            Manage your blog content
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            {(['all', 'published', 'draft'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                onClick={() => setFilter(f)}
                size="sm"
                className={
                  filter === f
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>

          <Link href="/admin/blog/new">
            <Button className="bg-rose-600 hover:bg-rose-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      <DataTable columns={columns} data={posts} searchKey="title" />
    </div>
  );
}