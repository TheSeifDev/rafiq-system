'use client';

import { useState, useEffect, useCallback } from 'react';
import { Service } from '@/src/types/database';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import {
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/services');
      const result = await response.json();

      if (result.success) {
        setServices(result.data);
      } else {
        toast.error('Failed to load services');
      }
    } catch (error) {
      toast.error('Error fetching services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const deleteService = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      const response = await fetch(`/api/admin/services?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Service deleted successfully');
        fetchServices();
      } else {
        toast.error(result.error || 'Failed to delete service');
      }
    } catch (error) {
      toast.error('Error deleting service');
    }
  };

  const toggleActive = async (service: Service) => {
    try {
      const response = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: service.id,
          is_active: !service.is_active,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(
          service.is_active ? 'Service deactivated' : 'Service activated'
        );
        fetchServices();
      } else {
        toast.error(result.error || 'Failed to update service');
      }
    } catch (error) {
      toast.error('Error updating service');
    }
  };

  const moveOrder = async (id: string, direction: 'up' | 'down') => {
    const currentIndex = services.findIndex((s) => s.id === id);
    if (currentIndex === -1) return;

    const newIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= services.length) return;

    const current = services[currentIndex];
    const swap = services[newIndex];

    try {
      await Promise.all([
        fetch('/api/admin/services', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: current.id,
            order_index: swap.order_index,
          }),
        }),
        fetch('/api/admin/services', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: swap.id,
            order_index: current.order_index,
          }),
        }),
      ]);

      toast.success('Order updated');
      fetchServices();
    } catch (error) {
      toast.error('Error updating order');
    }
  };

  const columns: ColumnDef<Service>[] = [
    {
      accessorKey: 'order_index',
      header: 'Order',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => moveOrder(row.original.id, 'up')}
            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
          >
            <ArrowUpDown className="h-3 w-3 rotate-180" />
          </Button>
          <span className="text-sm font-medium text-slate-300 w-6 text-center">
            {row.original.order_index}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => moveOrder(row.original.id, 'down')}
            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
          >
            <ArrowUpDown className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: 'title',
      header: 'Service',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-white">
            {row.original.title}
          </span>
          <span className="text-xs text-slate-500">/{row.original.slug}</span>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
      cell: ({ row }) => (
        <p className="max-w-xs truncate text-slate-400">
          {row.original.description}
        </p>
      ),
    },
    {
      accessorKey: 'features',
      header: 'Features',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Layers className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-sm text-slate-400">
            {Array.isArray(row.original.features)
              ? row.original.features.length
              : 0}{' '}
            features
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge
          variant={row.original.is_active ? 'default' : 'secondary'}
          className={
            row.original.is_active
              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
          }
        >
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
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
            onClick={() => toggleActive(row.original)}
            className={
              row.original.is_active
                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
            }
          >
            {row.original.is_active ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
          </Button>

          <Link href={`/admin/services/edit/${row.original.id}`}>
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
            onClick={() => deleteService(row.original.id)}
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
          <h1 className="text-3xl font-bold text-white">Services</h1>
          <p className="mt-1 text-slate-400">
            Manage your services and offerings
          </p>
        </div>

        <Link href="/admin/services/new">
          <Button className="bg-rose-600 hover:bg-rose-700 text-white">
            <Plus className="mr-2 h-4 w-4" />
            Add Service
          </Button>
        </Link>
      </div>

      <DataTable columns={columns} data={services} searchKey="title" />
    </div>
  );
}