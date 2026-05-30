'use client';

import { GenericForm, FormField } from '@/src/components/admin/GenericForm';
import { Review } from '@/src/types/database';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const reviewFields: FormField[] = [
  {
    name: 'name',
    label: 'Reviewer Name',
    type: 'text',
    required: true,
    placeholder: 'e.g., John Doe',
  },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    placeholder: 'e.g., john@example.com',
  },
  {
    name: 'rating',
    label: 'Rating',
    type: 'number',
    required: true,
    placeholder: '1 to 5',
    validation: { min: 1, max: 5 },
  },
  {
    name: 'content',
    label: 'Review Content',
    type: 'textarea',
    required: true,
    placeholder: 'Write the review content here...',
  },
  {
    name: 'is_approved',
    label: 'Approved',
    type: 'switch',
  },
  {
    name: 'is_pinned',
    label: 'Pinned',
    type: 'switch',
  },
];

export default function NewReviewPage() {
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          rating: Number(data.rating),
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
        title="Add New Review"
        fields={reviewFields}
        onSubmit={handleSubmit}
        onSuccess={() => {
          toast.success('Review added successfully!');
          router.push('/admin/reviews');
        }}
        submitLabel="Add Review"
      />
    </div>
  );
}