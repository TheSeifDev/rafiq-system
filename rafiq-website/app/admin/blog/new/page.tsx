'use client';

import { GenericForm, FormField } from '@/src/components/admin/GenericForm';
import { BlogPost } from '@/src/types/database';
import { useRouter } from 'next/navigation';
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
    placeholder: 'Write your blog content here (supports Markdown)...',
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

export default function NewBlogPostPage() {
  const router = useRouter();

  const handleSubmit = async (data: Partial<BlogPost>) => {
    try {
      const response = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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
      <GenericForm<BlogPost>
        title="Create New Blog Post"
        fields={blogFields}
        onSubmit={handleSubmit}
        onSuccess={() => {
          toast.success('Blog post created successfully!');
          router.push('/admin/blog');
        }}
        tableName="blog_posts"
      />
    </div>
  );
}