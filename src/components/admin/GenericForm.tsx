"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, X, Upload } from "lucide-react";

export interface FormField {
  name: string;
  label: string;
  type: "text" | "textarea" | "email" | "number" | "select" | "switch" | "image" | "date" | "url";
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    message?: string;
  };
  helperText?: string;
}

interface GenericFormProps {
  title: string;
  fields: FormField[];
  onSubmit: (data: any) => Promise<{ success: boolean; error?: string }>;
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultValues?: any;
  submitLabel?: string;
  cancelLabel?: string;
}

export function GenericForm({
  title,
  fields,
  onSubmit,
  onSuccess,
  onCancel,
  defaultValues = {},
  submitLabel = "Save",
  cancelLabel = "Cancel",
}: GenericFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<any>({});
  const [errors, setErrors] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<any>({});
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      setValues(defaultValues);
      const previews: any = {};
      fields.forEach((field) => {
        if (field.type === "image" && defaultValues[field.name]) {
          previews[field.name] = defaultValues[field.name];
        }
      });
      setImagePreviews(previews);
    }
  }, []); 
  useEffect(() => {
    if (initialized.current && Object.keys(defaultValues).length > 0) {
      setValues((prev: any) => {
        const newValues = { ...defaultValues };
        if (JSON.stringify(prev) === JSON.stringify(newValues)) {
          return prev; 
        }
        return newValues;
      });
    }
  }, [defaultValues]);

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || value === "")) {
      return `${field.label} is required`;
    }

    if (field.validation?.pattern && value && !field.validation.pattern.test(value)) {
      return field.validation.message || `Invalid ${field.label}`;
    }

    if (field.validation?.minLength && value?.length < field.validation.minLength) {
      return `${field.label} must be at least ${field.validation.minLength} characters`;
    }

    if (field.validation?.maxLength && value?.length > field.validation.maxLength) {
      return `${field.label} must be at most ${field.validation.maxLength} characters`;
    }

    if (field.type === "number" && value !== undefined && value !== "") {
      const numValue = Number(value);
      if (field.validation?.min !== undefined && numValue < field.validation.min) {
        return `${field.label} must be at least ${field.validation.min}`;
      }
      if (field.validation?.max !== undefined && numValue > field.validation.max) {
        return `${field.label} must be at most ${field.validation.max}`;
      }
    }

    return null;
  };

  const handleChange = useCallback((name: string, value: any) => {
    setValues((prev: any) => ({ ...prev, [name]: value }));
    setErrors((prev: any) => ({ ...prev, [name]: "" }));
  }, []);

  const handleImageChange = useCallback(async (e: any, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreviews((prev: any) => ({
        ...prev,
        [fieldName]: reader.result,
      }));
    };
    reader.readAsDataURL(file);

    handleChange(fieldName, file.name);
  }, [handleChange]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const newErrors: any = {};
    fields.forEach((field) => {
      const error = validateField(field, values[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the errors");
      return;
    }

    setLoading(true);

    try {
      const result = await onSubmit(values);

      if (result.success) {
        toast.success(`${title} saved successfully!`);
        onSuccess?.();
      } else {
        toast.error(result.error || "Something went wrong");
        setErrors({ submit: result.error || "Something went wrong" });
      }
    } catch (error: any) {
      toast.error(error.message || "Something went wrong");
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const renderField = useCallback((field: FormField) => {
    const value = values[field.name] ?? "";
    const error = errors[field.name];

    const baseInputClass = `w-full rounded-xl border ${
      error ? "border-red-500/50" : "border-white/10"
    } bg-white/5 px-4 py-3 text-sm text-white placeholder:text-slate-500 transition-all duration-300 focus:border-rose-500/50 focus:bg-white/[0.07] focus:outline-none focus:ring-1 focus:ring-rose-500/20`;

    switch (field.type) {
      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            rows={6}
            className={`${baseInputClass} resize-y min-h-[120px]`}
          />
        );

      case "switch":
        return (
          <button
            type="button"
            onClick={() => handleChange(field.name, !value)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              value ? "bg-rose-500" : "bg-slate-700"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                value ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        );

      case "image":
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 transition-all hover:bg-white/10">
                <Upload className="h-4 w-4" />
                Choose Image
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e: any) => handleImageChange(e, field.name)}
                  className="hidden"
                />
              </label>
              {value && <span className="text-sm text-slate-400">{value}</span>}
            </div>
            {imagePreviews[field.name] && (
              <div className="relative h-48 w-full overflow-hidden rounded-xl border border-white/10">
                <img
                  src={imagePreviews[field.name]}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              </div>
            )}
          </div>
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            className={`${baseInputClass} appearance-none`}
          >
            <option value="" className="bg-slate-900">Select {field.label}</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type={field.type === "email" ? "email" : field.type === "number" ? "number" : field.type === "date" ? "date" : field.type === "url" ? "url" : "text"}
            value={value}
            onChange={(e) => handleChange(field.name, e.target.value)}
            placeholder={field.placeholder}
            className={baseInputClass}
          />
        );
    }
  }, [values, errors, handleChange, handleImageChange, imagePreviews]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-slate-400">Fill in the details below</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-8 space-y-6">
        {errors.submit && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errors.submit}
          </div>
        )}

        {fields.map((field) => (
          <div key={field.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300">
                {field.label}
                {field.required && <span className="ml-1 text-rose-400">*</span>}
              </label>
              {errors[field.name] && (
                <span className="text-xs text-red-400">{errors[field.name]}</span>
              )}
            </div>

            {renderField(field)}

            {field.helperText && (
              <p className="text-xs text-slate-500">{field.helperText}</p>
            )}
          </div>
        ))}

        <div className="flex items-center gap-4 pt-4 border-t border-white/5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-2 rounded-xl border border-white/10 px-6 py-3 text-sm font-medium text-slate-300 transition-all hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
              {cancelLabel}
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-500/25 transition-all hover:shadow-rose-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {submitLabel}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}