'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GenericForm, FormField } from '@/src/components/admin/GenericForm';
import { Service } from '@/src/types/database';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const serviceFields: FormField[] = [
  {
    name: 'title',
    label: 'Service Title',
    type: 'text',
    required: true,
    placeholder: 'e.g., Web Development, UI/UX Design',
  },
  {
    name: 'slug',
    label: 'Slug',
    type: 'text',
    required: true,
    placeholder: 'service-url-slug',
    validation: {
      pattern: /^[a-z0-9-]+$/,
      message: 'Slug must contain only lowercase letters, numbers, and hyphens',
    },
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    required: true,
    placeholder: 'Describe the service in detail...',
  },
  {
    name: 'icon_name',
    label: 'Icon Name',
    type: 'text',
    placeholder: 'e.g., Code, Palette, Smartphone (Lucide icon name)',
  },
  {
    name: 'features',
    label: 'Features (JSON Array)',
    type: 'json',
    placeholder: '["Feature 1", "Feature 2", "Feature 3"]',
  },
  {
    name: 'is_active',
    label: 'Active',
    type: 'switch',
  },
  {
    name: 'order_index',
    label: 'Display Order',
    type: 'number',
    placeholder: '0',
    validation: { min: 0 },
  },
];

export default function EditServicePage() {
  const params = useParams();
  const router = useRouter();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchService();
  }, [params.id]);

  const fetchService = async () => {
    try {
      const response = await fetch('/api/admin/services');
      const result = await response.json();

      if (result.success) {
        const found = result.data.find((s: Service) => s.id === params.id);
        if (found) {
          setService(found);
        } else {
          toast.error('Service not found');
          router.push('/admin/services');
        }
      }
    } catch (error) {
      toast.error('Error loading service');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Partial<Service>) => {
    try {
      let features = data.features;
      if (typeof features === 'string') {
        try {
          features = JSON.parse(features);
        } catch {
          features = [];
        }
      }

      const response = await fetch('/api/admin/services', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: params.id,
          ...data,
          features: features || [],
        }),
      });

      const result = await response.json();

      if (result.success) {
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!service) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <GenericForm<Service>
        title="Edit Service"
        fields={serviceFields}
        initialData={service}
        onSubmit={handleSubmit}
        onSuccess={() => {
          toast.success('Service updated successfully!');
          router.push('/admin/services');
        }}
        submitLabel="Update Service"
        tableName="services"
      />
    </div>
  );
}