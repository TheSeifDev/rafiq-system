// app/admin/media/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { MediaItem } from '@/src/types/database';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ImageIcon, 
  Trash2, 
  Loader2, 
  Upload, 
  FileImage,
  Copy,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/media');
      const result = await response.json();

      if (result.success) {
        setMedia(result.data);
      } else {
        toast.error('Failed to load media');
      }
    } catch (error) {
      toast.error('Error fetching media');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bucket', 'media');
    formData.append('folder', 'general');

    try {
      const response = await fetch('/api/admin/media', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        toast.success('File uploaded successfully');
        fetchMedia();
      } else {
        toast.error(result.error || 'Upload failed');
      }
    } catch (error) {
      toast.error('Error uploading file');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const deleteMedia = async (id: string, filePath: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`/api/admin/media?id=${id}&path=${filePath}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('File deleted');
        fetchMedia();
      } else {
        toast.error(result.error || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Error deleting file');
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns: ColumnDef<MediaItem>[] = [
    {
      accessorKey: 'file_path',
      header: 'Preview',
      cell: ({ row }: { row: { original: MediaItem } }) => (
        <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-800 border border-slate-700">
          {row.original.file_type?.startsWith('image/') ? (
            <img
              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${row.original.file_path}`}
              alt={row.original.file_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <FileImage className="h-5 w-5 text-slate-500" />
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'file_name',
      header: 'File Name',
      cell: ({ row }: { row: { original: MediaItem } }) => (
        <div className="flex flex-col">
          <span className="font-medium text-white truncate max-w-[200px]">
            {row.original.file_name}
          </span>
          <span className="text-xs text-slate-400">{row.original.file_type}</span>
        </div>
      ),
    },
    {
      accessorKey: 'bucket_name',
      header: 'Bucket',
      cell: ({ row }: { row: { original: MediaItem } }) => (
        <Badge variant="outline" className="border-slate-700 text-slate-300">
          {row.original.bucket_name}
        </Badge>
      ),
    },
    {
      accessorKey: 'file_size',
      header: 'Size',
      cell: ({ row }: { row: { original: MediaItem } }) => (
        <span className="text-slate-300">{formatFileSize(row.original.file_size)}</span>
      ),
    },
    {
      accessorKey: 'used_in',
      header: 'Used In',
      cell: ({ row }: { row: { original: MediaItem } }) => (
        <span className="text-slate-400 text-sm">
          {row.original.used_in || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Uploaded',
      cell: ({ row }: { row: { original: MediaItem } }) => (
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
      cell: ({ row }: { row: { original: MediaItem } }) => {
        const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${row.original.file_path}`;
        
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyUrl(publicUrl)}
              title="Copy URL"
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            >
              <Copy className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(publicUrl, '_blank')}
              title="Open"
              className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteMedia(row.original.id, row.original.file_path)}
              title="Delete"
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
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
          <div className="h-10 w-32 bg-slate-800 rounded animate-pulse" />
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
          <h1 className="text-3xl font-bold text-white">Media Library</h1>
          <p className="mt-1 text-slate-400">
            Manage uploaded images and files
          </p>
        </div>

        <div className="relative">
          <input
            type="file"
            accept="image/*"
            onChange={handleUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={uploading}
          />
          <Button
            className="bg-rose-600 hover:bg-rose-700 text-white"
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {uploading ? 'Uploading...' : 'Upload File'}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-blue-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2 border border-slate-700/50">
              <ImageIcon className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{media.length}</p>
              <p className="text-sm text-slate-400">Total Files</p>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable 
        columns={columns} 
        data={media}
        searchKey="file_name"
      />
    </div>
  );
}