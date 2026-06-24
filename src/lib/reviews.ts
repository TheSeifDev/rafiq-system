import { createServerSupabaseClient } from '@/lib/server';

export type Review = {
  id: string;
  name: string;
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
  'id, name, rating, content, featured, approved, created_at';

export async function getApprovedReviews(options: GetReviewsOptions = {}) {
  const supabase = await createServerSupabaseClient();

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



  return data ?? [];
}

export async function getFeaturedReviews(limit?: number) {
  return getApprovedReviews({
    featured: true,
    limit,
  });
}