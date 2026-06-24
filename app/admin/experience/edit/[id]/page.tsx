"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { GenericForm, FormField } from "@/src/components/admin/GenericForm";
import { Experience } from "@/src/types/database";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type ExperienceInput = Partial<Experience>;

const experienceFields: FormField[] = [
  {
    name: "company",
    label: "Company Name",
    type: "text",
    required: true,
    placeholder: "e.g., Google, Microsoft, etc.",
  },
  {
    name: "role",
    label: "Role / Position",
    type: "text",
    required: true,
    placeholder: "e.g., Senior Frontend Developer",
  },
  {
    name: "description",
    label: "Description",
    type: "textarea",
    placeholder: "Describe your responsibilities and achievements...",
  },
  {
    name: "location",
    label: "Location",
    type: "text",
    placeholder: "e.g., San Francisco, CA or Remote",
  },
  {
    name: "start_date",
    label: "Start Date",
    type: "date",
    required: true,
  },
  {
    name: "end_date",
    label: "End Date",
    type: "date",
  },
  {
    name: "is_current",
    label: "Current Position",
    type: "switch",
  },
  {
    name: "logo_url",
    label: "Company Logo",
    type: "image",
  },
  {
    name: "order_index",
    label: "Display Order",
    type: "number",
    placeholder: "0",
    validation: {
      min: 0,
    },
  },
];

export default function EditExperiencePage() {
  const params = useParams();
  const router = useRouter();

  const [experience, setExperience] = useState<Experience | null>(null);
  const [loading, setLoading] = useState(true);

  const id = params?.id as string;

  const fetchExperience = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/experience");
      const result: { success: boolean; data: Experience[] } =
        await response.json();

      if (!result.success) {
        toast.error("Failed to load experience");
        router.push("/admin/experience");
        return;
      }

      const found = result.data.find((e) => e.id === id);

      if (!found) {
        toast.error("Experience not found");
        router.push("/admin/experience");
        return;
      }

      setExperience(found);
    } catch (error) {
      toast.error("Error loading experience");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) fetchExperience();
  }, [id, fetchExperience]);

  const handleSubmit = useCallback(
    async (data: ExperienceInput) => {
      try {
        const response = await fetch("/api/admin/experience", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id, ...data }),
        });

        const result: { success: boolean; error?: string } =
          await response.json();

        if (!response.ok || !result.success) {
          return {
            success: false,
            error: result.error || "Failed to update experience",
          };
        }

        return { success: true };
      } catch (error: unknown) {
        const message =
          error instanceof Error
            ? error.message
            : "Unexpected error occurred";

        return {
          success: false,
          error: message,
        };
      }
    },
    [id]
  );

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (!experience) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <GenericForm
        title="Edit Experience"
        fields={experienceFields}
        defaultValues={experience}
        onSubmit={handleSubmit}
        onSuccess={() => {
          toast.success("Experience updated successfully!");
          router.push("/admin/experience");
        }}
        onCancel={() => router.push("/admin/experience")}
        submitLabel="Update Experience"
      />
    </div>
  );
}