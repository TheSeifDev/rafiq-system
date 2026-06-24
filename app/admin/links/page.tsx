"use client";

import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Eye, EyeOff,
  Mail, Phone, MessageCircle, Globe, ExternalLink,
  Save, X, Loader2, type LucideIcon
} from "lucide-react";

interface Link {
  id: string;
  name: string;
  url: string;
  icon: string;
  category: string;
  is_active: boolean;
  display_order: number;
  is_in_nav: boolean;
}

interface IconProps {
  className?: string;
}

const FacebookIcon = ({ className }: IconProps) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ className }: IconProps) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const TwitterIcon = ({ className }: IconProps) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
  </svg>
);

const LinkedInIcon = ({ className }: IconProps) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const YouTubeIcon = ({ className }: IconProps) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

type IconComponent = React.FC<IconProps> | LucideIcon;

const iconMap: Record<string, IconComponent> = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  twitter: TwitterIcon,
  linkedin: LinkedInIcon,
  youtube: YouTubeIcon,
  mail: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  globe: Globe,
  external: ExternalLink,
};

export default function LinksManager() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLink, setEditingLink] = useState<Link | null>(null);

  const [formData, setFormData] = useState({
    name: "", url: "", icon: "globe", category: "social",
    is_active: true, display_order: 0, is_in_nav: false,
  });

  useEffect(() => { fetchLinks(); }, []);

  async function fetchLinks() {
    setLoading(true);
    const res = await fetch("/api/links");
    const result = await res.json();
    if (result.success) setLinks(result.data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editingLink ? "PUT" : "POST";
    const body = editingLink ? { ...formData, id: editingLink.id } : formData;

    const res = await fetch("/api/links", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await res.json();

    if (result.success) {
      setShowForm(false);
      setEditingLink(null);
      resetForm();
      fetchLinks();
    } else {
      alert(result.error || "Failed");
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch("/api/links", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
    if (res.ok) fetchLinks();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this link?")) return;
    const res = await fetch(`/api/links?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchLinks();
  }

  function resetForm() {
    setFormData({ name: "", url: "", icon: "globe", category: "social", is_active: true, display_order: 0, is_in_nav: false });
  }

  function startEdit(link: Link) {
    setEditingLink(link);
    setFormData({ ...link });
    setShowForm(true);
  }

  const socialLinks = links.filter(l => l.category === "social");
  const contactLinks = links.filter(l => l.category === "contact");
  const externalLinks = links.filter(l => l.category === "external");

  return (
    <div className="min-h-screen bg-[#000109] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Links Manager</h1>
            <p className="mt-1 text-sm text-slate-400">Control all website links</p>
          </div>
          <button onClick={() => { setEditingLink(null); resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-500/25">
            <Plus className="h-4 w-4" /> New Link
          </button>
        </div>

        {showForm && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{editingLink ? "Edit Link" : "New Link"}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Name</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rose-500/50 focus:outline-none" placeholder="Facebook" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">URL</label>
                <input value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rose-500/50 focus:outline-none" placeholder="https://..." />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Icon</label>
                <select value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-rose-500/50 focus:outline-none">
                  {Object.keys(iconMap).map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Category</label>
                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-rose-500/50 focus:outline-none">
                  <option value="social">Social</option>
                  <option value="contact">Contact</option>
                  <option value="external">External</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-rose-500" />
                <label htmlFor="is_active" className="text-sm text-slate-300">Active</label>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_in_nav" checked={formData.is_in_nav} onChange={e => setFormData({...formData, is_in_nav: e.target.checked})}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-rose-500" />
                <label htmlFor="is_in_nav" className="text-sm text-slate-300">Show in Navigation</label>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
                <button type="submit" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2.5 text-sm text-white"><Save className="h-4 w-4" /> {editingLink ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        )}

        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-rose-500" /></div> : (
          <div className="space-y-6">
            {[
              { title: "Social Media", items: socialLinks, color: "blue" },
              { title: "Contact", items: contactLinks, color: "emerald" },
              { title: "External", items: externalLinks, color: "amber" },
            ].map(({ title, items, color }) => items.length > 0 && (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <h3 className={`mb-4 text-lg font-semibold text-${color}-400`}>{title}</h3>
                <div className="grid gap-3">
                  {items.map(link => {
                    const Icon = iconMap[link.icon] || Globe;
                    return (
                      <div key={link.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-4">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 text-${color}-400`} />
                          <div>
                            <p className="text-sm font-medium text-white">{link.name}</p>
                            <p className="text-xs text-slate-500 truncate max-w-[300px]">{link.url}</p>
                          </div>
                          {link.is_in_nav && <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-xs text-rose-400">Nav</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleActive(link.id, link.is_active)} className={`rounded-lg p-2 ${link.is_active ? "text-emerald-400 hover:bg-emerald-500/10" : "text-slate-500 hover:bg-white/5"}`}>
                            {link.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                          </button>
                          <button onClick={() => startEdit(link)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => handleDelete(link.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}