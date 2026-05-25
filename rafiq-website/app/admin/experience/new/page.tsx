'use client';

import { GenericForm, FormField } from '@/src/components/admin/GenericForm';
import { Experience } from '@/src/types/database';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const experienceFields: FormField[] = [
  {
    name: 'company',
    label: 'Company Name',
    type: 'text',
    required: true,
    placeholder: 'e.g., Google, Microsoft, etc.',
  },
  {
    name: 'role',
    label: 'Role / Position',
    type: 'text',
    required: true,
    placeholder: 'e.g., Senior Frontend Developer',
  },
  {
    name: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Describe your responsibilities and achievements...',
  },
  {
    name: 'location',
    label: 'Location',
    type: 'text',
    placeholder: 'e.g., San Francisco, CA or Remote',
  },
  {
    name: 'start_date',
    label: 'Start Date',
    type: 'date',
    required: true,
  },
  {
    name: 'end_date',
    label: 'End Date',
    type: 'date',
  },
  {
    name: 'is_current',
    label: 'Current Position',
    type: 'switch',
  },
  {
    name: 'logo_url',
    label: 'Company Logo',
    type: 'image',
  },
  {
    name: 'order_index',
    label: 'Display Order',
    type: 'number',
    placeholder: '0',
    validation: { min: 0 },
  },
];

export default function NewExperiencePage() {
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/admin/experience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          order_index: data.order_index || 0,
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

  return (
    <div className="mx-auto max-w-4xl">
      <GenericForm
        title="Add New Experience"
        fields={experienceFields}
        onSubmit={handleSubmit}
        onSuccess={() => {
          toast.success('Experience added successfully!');
          router.push('/admin/experience');
        }}
        submitLabel="Add Experience"
      />
    </div>
  );
}