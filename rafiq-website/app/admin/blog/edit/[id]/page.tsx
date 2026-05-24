'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { GenericForm, FormField } from '@/src/components/admin/GenericForm';
import { BlogPost } from '@/src/types/database';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const blogFields: FormField[] = [
  {
    name: 'title',
    label: 'Title',
    type: 'text',
    required: true,
    placeholder: 'Enter blog post title',
  },
  {
    name: 'slug',
    label: 'Slug',
    type: 'text',
    required: true,
    placeholder: 'enter-url-slug',
    validation: {
      pattern: /^[a-z0-9-]+$/,
      message: 'Slug must contain only lowercase letters, numbers, and hyphens',
    },
  },
  {
    name: 'excerpt',
    label: 'Excerpt',
    type: 'textarea',
    placeholder: 'Short description for SEO and previews...',
  },
  {
    name: 'content',
    label: 'Content',
    type: 'textarea',
    required: true,
    placeholder: 'Write your blog content here...',
  },
  {
    name: 'cover_image',
    label: 'Cover Image',
    type: 'image',
  },
  {
    name: 'author_name',
    label: 'Author Name',
    type: 'text',
    placeholder: 'Author name',
  },
  {
    name: 'is_published',
    label: 'Published',
    type: 'switch',
  },
];

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost();
  }, [params.id]);

  const fetchPost = async () => {
    try {
      const response = await fetch(`/api/admin/blog`);
      const result = await response.json();
      
      if (result.success) {
        const found = result.data.find((p: BlogPost) => p.id === params.id);
        if (found) {
          setPost(found);
        } else {
          toast.error('Post not found');
          router.push('/admin/blog');
        }
      }
    } catch (error) {
      toast.error('Error loading post');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: Partial<BlogPost>) => {
    try {
      const response = await fetch('/api/admin/blog', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: params.id, ...data }),
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

  if (!post) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <GenericForm<BlogPost>
        title="Edit Blog Post"
        fields={blogFields}
        initialData={post}
        onSubmit={handleSubmit}
        onSuccess={() => {
          toast.success('Blog post updated successfully!');
          router.push('/admin/blog');
        }}
        submitLabel="Update Post"
        tableName="blog_posts"
      />
    </div>
  );
}