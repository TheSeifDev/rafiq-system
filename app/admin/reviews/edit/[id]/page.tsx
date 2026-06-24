'use client';

import { GenericForm, FormField } from '@/src/components/admin/GenericForm';
import { Review } from '@/src/types/database';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type ReviewInput = Partial<Review>;

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

export default function EditReviewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReview = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/reviews?id=${id}`);
      const result: { success: boolean; data: Review } =
        await response.json();

      if (!result.success) {
        toast.error('Failed to load review');
        router.push('/admin/reviews');
        return;
      }

      setReview(result.data);
    } catch {
      toast.error('Error fetching review');
      router.push('/admin/reviews');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) fetchReview();
  }, [id, fetchReview]);

  const handleSubmit = useCallback(
    async (data: ReviewInput) => {
      try {
        const response = await fetch('/api/admin/reviews', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id,
            ...data,
            rating: Number(data.rating),
          }),
        });

        const result: { success: boolean; error?: string } =
          await response.json();

        if (!response.ok || !result.success) {
          return {
            success: false,
            error: result.error || 'Failed to update review',
          };
        }

        return { success: true };
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : 'Unexpected error occurred';

        return { success: false, error: message };
      }
    },
    [id]
  );

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!review) return null;

  const defaultValues: ReviewInput = {
    name: review.name,
    email: review.email,
    rating: review.rating,
    content: review.content,
    is_approved: review.is_approved,
    is_pinned: review.is_pinned,
  };

  return (
    <div className="mx-auto max-w-4xl">
      <GenericForm
        title="Edit Review"
        fields={reviewFields}
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        onSuccess={() => {
          toast.success('Review updated successfully!');
          router.push('/admin/reviews');
        }}
        onCancel={() => router.push('/admin/reviews')}
        submitLabel="Update Review"
      />
    </div>
  );
}