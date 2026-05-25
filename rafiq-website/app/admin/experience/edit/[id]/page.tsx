"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { GenericForm, FormField } from "@/src/components/admin/GenericForm";
import { Experience } from "@/src/types/database";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
    validation: { min: 0 },
  },
];

export default function EditExperiencePage() {
  const params = useParams();
  const router = useRouter();
  const [experience, setExperience] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExperience();
  }, [params.id]);

  const fetchExperience = async () => {
    try {
      const response = await fetch("/api/admin/experience");
      const result = await response.json();

      if (result.success) {
        const found = result.data.find((e: Experience) => e.id === params.id);
        if (found) {
          setExperience(found);
        } else {
          toast.error("Experience not found");
          router.push("/admin/experience");
        }
      }
    } catch (error) {
      toast.error("Error loading experience");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      const response = await fetch("/api/admin/experience", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
        submitLabel="Update Experience"
      />
    </div>
  );
}