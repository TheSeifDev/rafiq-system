export interface Review {
  id: string;
  name: string;
  email: string;
  rating: number;
  content: string;
  is_approved: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  author_name: string | null;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  location: string | null;
  logo_url: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  title: string;
  slug: string;
  description: string;
  icon_name: string | null;
  features: string[];
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Link {
  id: string;
  title: string;
  url: string;
  icon_name: string | null;
  category: string;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

export interface MediaItem {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  bucket_name: string;
  alt_text: string | null;
  used_in: string | null;
  created_at: string;
}

export type TableName = 'reviews' | 'blog_posts' | 'experiences' | 'services' | 'links' | 'media';