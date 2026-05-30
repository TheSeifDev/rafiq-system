import { createClient } from '@/lib/server';

export type Review = {
  id: string;
  name: string;
  role: string | null;
  rating: number;
  text: string;
  featured: boolean;
  approved: boolean;
  created_at: string;
};

type GetReviewsOptions = {
  limit?: number;
  featured?: boolean;
};

const REVIEW_COLUMNS =
  'id, name, role, rating, text, featured, approved, created_at';

export async function getApprovedReviews(options: GetReviewsOptions = {}) {
  const supabase = await createClient();

  let query = supabase
    .from('reviews')
    .select(REVIEW_COLUMNS)
    .eq('approved', true)
    .order('created_at', { ascending: false });

  if (typeof options.featured === 'boolean') {
    query = query.eq('featured', options.featured);
  }

  if (typeof options.limit === 'number') {
    query = query.limit(options.limit);
  }

  const { data, error } = await query.returns<Review[]>();

  if (error) {
    console.error('Failed to fetch reviews:', error);
    return [];
  }

  return data ?? [];
}

export async function getFeaturedReviews(limit?: number) {
  return getApprovedReviews({
    featured: true,
    limit,
  });
}
