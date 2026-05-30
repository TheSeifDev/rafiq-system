"use client";

import { GenericForm, FormField } from "@/src/components/admin/GenericForm";
import { Service } from "@/src/types/database";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const serviceFields: FormField[] = [
  {
    name: "title",
    label: "Service Title",
    type: "text",
    required: true,
    placeholder: "e.g., Web Development",
  },
  {
    name: "slug",
    label: "Slug",
    type: "text",
    required: true,
    placeholder: "service-url-slug",
    validation: {
      pattern: /^[a-z0-9-]+$/,
      message: "Slug must contain only lowercase letters, numbers, and hyphens",
    },
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    required: true,
    placeholder: "Describe the service...",
  },
  {
    name: "icon_name",
    label: "Icon Name",
    type: "text",
    placeholder: "e.g., Code, Palette",
  },
  {
    name: "features",
    label: "Features (JSON Array)",
    type: "textarea",
    placeholder: '["Feature 1", "Feature 2"]',
  },
  {
    name: "is_active",
    label: "Active",
    type: "switch",
  },
  {
    name: "order_index",
    label: "Display Order",
    type: "number",
    placeholder: "0",
    validation: { min: 0 },
  },
];

export default function NewServicePage() {
  const router = useRouter();

  const handleSubmit = async (data: Partial<Service>) => {
    try {
      let features = data.features;
      if (typeof features === "string") {
        try {
          features = JSON.parse(features);
        } catch {
          features = [];
        }
      }

      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          features: features || [],
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
      title="Add New Service"
      fields={serviceFields}
      onSubmit={handleSubmit}
      onSuccess={() => {
        toast.success("Service added successfully!");
        router.push("/admin/services");
      }}
    />
  </div>
);
}