"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Save, X } from "lucide-react";

interface ExploreItem {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  link: string | null;
  display_order: number;
  is_active: boolean;
}

const iconOptions = ["Cpu", "Shield", "Zap", "Globe", "Users", "Rocket", "Code", "Brain", "Wifi", "Database"];

export default function ExploreManager() {
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ExploreItem | null>(null);

  const [formData, setFormData] = useState({
    title: "", description: "", icon: "Cpu", link: "", display_order: 0, is_active: true,
  });

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    const res = await fetch("/api/explore");
    const result = await res.json();
    if (result.success) setItems(result.data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editingItem ? "PUT" : "POST";
    const body = editingItem ? { ...formData, id: editingItem.id } : formData;

    const res = await fetch("/api/explore", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await res.json();

    if (result.success) {
      setShowForm(false);
      setEditingItem(null);
      resetForm();
      fetchItems();
    } else {
      alert(result.error || "Failed");
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch("/api/explore", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
    if (res.ok) fetchItems();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete?")) return;
    const res = await fetch(`/api/explore?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchItems();
  }

  function resetForm() { setFormData({ title: "", description: "", icon: "Cpu", link: "", display_order: 0, is_active: true }); }

  function startEdit(item: ExploreItem) {
    setEditingItem(item);
    setFormData({ ...item, description: item.description || "", icon: item.icon || "Cpu", link: item.link || "" });
    setShowForm(true);
  }

  return (
    <div className="min-h-screen bg-[#000109] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Explore Manager</h1>
            <p className="mt-1 text-sm text-slate-400">Control explore button content</p>
          </div>
          <button onClick={() => { setEditingItem(null); resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-500/25">
            <Plus className="h-4 w-4" /> Add Item
          </button>
        </div>

        {showForm && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{editingItem ? "Edit" : "New"} Item</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Title</label>
                <input value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-rose-500/50 focus:outline-none" placeholder="AI Engineering" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Icon</label>
                <select value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value})}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-rose-500/50 focus:outline-none">
                  {iconOptions.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Link</label>
                <input value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-rose-500/50 focus:outline-none" placeholder="/services/ai" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Order</label>
                <input type="number" value={formData.display_order} onChange={e => setFormData({...formData, display_order: parseInt(e.target.value) || 0})}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-rose-500/50 focus:outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-rose-500/50 focus:outline-none" placeholder="Description..." />
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-rose-500" />
                <label htmlFor="is_active" className="text-sm text-slate-300">Active</label>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
                <button type="submit" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2.5 text-sm text-white"><Save className="h-4 w-4" /> {editingItem ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        )}

        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-rose-500" /></div> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map(item => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="rounded-lg bg-rose-500/10 px-2 py-1 text-xs text-rose-400">{item.icon}</span>
                      <span className={`rounded-lg px-2 py-1 text-xs ${item.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-400"}`}>
                        {item.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{item.description}</p>
                    {item.link && <p className="mt-1 text-xs text-slate-500">{item.link}</p>}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <button onClick={() => toggleActive(item.id, item.is_active)} className={`rounded-lg p-2 ${item.is_active ? "text-emerald-400 hover:bg-emerald-500/10" : "text-slate-500 hover:bg-white/5"}`}>
                    {item.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => startEdit(item)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => handleDelete(item.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}