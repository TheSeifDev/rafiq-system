'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

export type FieldType = 
  | 'text' 
  | 'textarea' 
  | 'number' 
  | 'email' 
  | 'select' 
  | 'switch' 
  | 'date' 
  | 'image'
  | 'json';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: RegExp;
    message?: string;
  };
}

interface GenericFormProps<T extends Record<string, any>> {
  title: string;
  fields: FormField[];
  initialData?: Partial<T>;
  onSubmit: (data: T) => Promise<{ success: boolean; error?: string }>;
  onSuccess?: () => void;
  submitLabel?: string;
  tableName: string;
}

export function GenericForm<T extends Record<string, any>>({
  title,
  fields,
  initialData,
  onSubmit,
  onSuccess,
  submitLabel = 'Save',
  tableName,
}: GenericFormProps<T>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<T>>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const value = formData[field.name as keyof T];
      if (field.required && !value) {
        newErrors[field.name] = `${field.label} is required`;
      }
      if (field.validation?.pattern && value) {
        if (!field.validation.pattern.test(String(value))) {
          newErrors[field.name] = field.validation.message || 'Invalid format';
        }
      }
      if (field.type === 'number' && value !== undefined) {
        const num = Number(value);
        if (field.validation?.min !== undefined && num < field.validation.min) {
          newErrors[field.name] = `Minimum value is ${field.validation.min}`;
        }
        if (field.validation?.max !== undefined && num > field.validation.max) {
          newErrors[field.name] = `Maximum value is ${field.validation.max}`;
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (name: keyof T, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name as string];
        return next;
      });
    }
  };

  const handleImageUpload = async (fieldName: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', 'media');
      formData.append('folder', tableName);
      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        handleChange(fieldName as keyof T, result.data.url);
        toast.success('Image uploaded successfully');
      } else {
        toast.error(result.error || 'Upload failed');
      }
    } catch (error) {
      toast.error('Error uploading image');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await onSubmit(formData as T);
      if (result.success) {
        toast.success(`${title} saved successfully`);
        onSuccess?.();
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to save');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: FormField) => {
    const value = formData[field.name as keyof T];
    const error = errors[field.name];
    const fieldWrapper = (children: React.ReactNode) => (
      <div className="space-y-2" key={field.name}>
        <Label htmlFor={field.name} className="text-slate-200">
          {field.label}
          {field.required && <span className="ml-1 text-rose-500">*</span>}
        </Label>
        {children}
        {error && <p className="text-sm text-rose-400">{error}</p>}
      </div>
    );

    switch (field.type) {
      case 'textarea':
        return fieldWrapper(
          <Textarea id={field.name} placeholder={field.placeholder} value={String(value || '')} onChange={(e) => handleChange(field.name as keyof T, e.target.value)} className="min-h-[120px] border-slate-700 bg-slate-900 text-white focus:border-rose-500 focus:ring-rose-500" />
        );
      case 'number':
        return fieldWrapper(
          <Input id={field.name} type="number" placeholder={field.placeholder} value={value !== undefined ? value : ''} onChange={(e) => handleChange(field.name as keyof T, Number(e.target.value))} className="border-slate-700 bg-slate-900 text-white focus:border-rose-500 focus:ring-rose-500" />
        );
      case 'select':
        return fieldWrapper(
          <Select value={String(value || '')} onValueChange={(v) => handleChange(field.name as keyof T, v)}>
            <SelectTrigger className="border-slate-700 bg-slate-900 text-white focus:ring-rose-500">
              <SelectValue placeholder={field.placeholder || 'Select...'} />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900">
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-white focus:bg-slate-800 focus:text-white">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'switch':
        return fieldWrapper(
          <div className="flex items-center gap-3">
            <Switch id={field.name} checked={Boolean(value)} onCheckedChange={(checked) => handleChange(field.name as keyof T, checked)} className="data-[state=checked]:bg-rose-600" />
            <span className="text-sm text-slate-400">{Boolean(value) ? 'Active' : 'Inactive'}</span>
          </div>
        );
      case 'date':
        return fieldWrapper(
          <Input id={field.name} type="date" value={value ? new Date(value).toISOString().split('T')[0] : ''} onChange={(e) => handleChange(field.name as keyof T, e.target.value)} className="border-slate-700 bg-slate-900 text-white focus:border-rose-500 focus:ring-rose-500" />
        );
      case 'image':
        return fieldWrapper(
          <div className="space-y-3">
            {value && <div className="relative h-40 w-full overflow-hidden rounded-lg border border-slate-700"><img src={String(value)} alt="Preview" className="h-full w-full object-cover" /></div>}
            <div className="flex items-center gap-3">
              <Input id={field.name} type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(field.name, file); }} className="border-slate-700 bg-slate-900 text-white file:bg-rose-600 file:text-white file:border-0" />
              {value && <Button type="button" variant="outline" size="sm" onClick={() => handleChange(field.name as keyof T, '')} className="border-slate-700 text-slate-300 hover:bg-slate-800">Remove</Button>}
            </div>
          </div>
        );
      case 'json':
        return fieldWrapper(
          <Textarea id={field.name} placeholder={field.placeholder || 'Enter JSON...'} value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || '')} onChange={(e) => { try { handleChange(field.name as keyof T, JSON.parse(e.target.value)); } catch { handleChange(field.name as keyof T, e.target.value); } }} className="min-h-[150px] font-mono text-sm border-slate-700 bg-slate-900 text-white focus:border-rose-500 focus:ring-rose-500" />
        );
      default:
        return fieldWrapper(
          <Input id={field.name} type={field.type} placeholder={field.placeholder} value={String(value || '')} onChange={(e) => handleChange(field.name as keyof T, e.target.value)} className="border-slate-700 bg-slate-900 text-white placeholder:text-slate-500 focus:border-rose-500 focus:ring-rose-500" />
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        {fields.map((field) => renderField(field))}
      </div>
      <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-800">
        <Button type="button" variant="outline" onClick={() => router.back()} className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancel</Button>
        <Button type="submit" disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white">
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> {submitLabel}</>}
        </Button>
      </div>
    </form>
  );
}