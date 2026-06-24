"use client";

import { GenericForm, FormField } from "@/src/components/admin/GenericForm";
import { BlogPost } from "@/src/types/database";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCallback } from "react";

type BlogPostInput = Omit<BlogPost, "id" | "created_at" | "updated_at">;

const blogFields: FormField[] = [
  {
    name: "title",
    label: "Title",
    type: "text",
    required: true,
    placeholder: "Enter blog post title",
    validation: {
      minLength: 3,
      maxLength: 120,
      message: "Title must be between 3 and 120 characters",
    },
  },
  {
    name: "slug",
    label: "Slug",
    type: "text",
    required: true,
    placeholder: "enter-url-slug",
    validation: {
      pattern: /^[a-z0-9-]+$/,
      message: "Slug must contain only lowercase letters, numbers, and hyphens",
    },
    helperText: "This will be used in the URL: /blog/your-slug",
  },
  {
    name: "excerpt",
    label: "Excerpt",
    type: "textarea",
    placeholder: "Short description for SEO and previews...",
    validation: {
      maxLength: 300,
      message: "Excerpt should be under 300 characters for best SEO",
    },
    helperText: "Recommended: 150-300 characters for optimal SEO",
  },
  {
    name: "content",
    label: "Content",
    type: "textarea",
    required: true,
    placeholder: "Write your blog content here (supports Markdown)...",
    validation: {
      minLength: 50,
      message: "Content should be at least 50 characters",
    },
  },
  {
    name: "cover_image",
    label: "Cover Image",
    type: "image",
    helperText: "Recommended size: 1200x630px for social sharing",
  },
  {
    name: "author_name",
    label: "Author Name",
    type: "text",
    placeholder: "Author name",
    validation: {
      minLength: 2,
      message: "Author name must be at least 2 characters",
    },
  },
  {
    name: "is_published",
    label: "Published",
    type: "switch",
    helperText: "Toggle to publish immediately or save as draft",
  },
];

export default function NewBlogPostPage() {
  const router = useRouter();

  const handleSubmit = useCallback(async (data: BlogPostInput) => {
    try {
      const response = await fetch("/api/admin/blog", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result: { success: boolean; error?: string } =
        await response.json();

      if (!response.ok || !result.success) {
        return {
          success: false,
          error: result.error || "Failed to create blog post",
        };
      }

      return { success: true };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Unexpected error occurred";

      return {
        success: false,
        error: message,
      };
    }
  }, []);

  const handleSuccess = useCallback(() => {
    toast.success("Blog post created successfully!");
    router.push("/admin/blog");
  }, [router]);

  const handleCancel = useCallback(() => {
    router.push("/admin/blog");
  }, [router]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-white">
          Create New Blog Post
        </h1>
        <p className="text-slate-400">
          Write and publish a new blog post. Fill in all required fields marked
          with *
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <GenericForm
          title="Create New Blog Post"
          fields={blogFields}
          onSubmit={handleSubmit}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          submitLabel="Create Post"
          cancelLabel="Cancel"
        />
      </div>
    </div>
  );
}