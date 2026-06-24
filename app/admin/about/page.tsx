"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, RefreshCw } from "lucide-react";

interface AboutContent {
  id: string;
  section: string;
  title: string;
  content: string;
  stats: any;
}

export default function AboutManager() {
  const [aboutData, setAboutData] = useState<AboutContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchAbout(); }, []);

  async function fetchAbout() {
    setLoading(true);
    const res = await fetch("/api/about");
    const result = await res.json();
    if (result.success) setAboutData(result.data || []);
    setLoading(false);
  }

  async function handleSave(section: AboutContent) {
    setSaving(true);
    const res = await fetch("/api/about", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(section),
    });
    if (res.ok) {
      alert("Saved!");
      fetchAbout();
    }
    setSaving(false);
  }

  function updateField(id: string, field: string, value: any) {
    setAboutData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  }

  function updateStats(id: string, key: string, value: any) {
    setAboutData(prev => prev.map(item => {
      if (item.id !== id) return item;
      return { ...item, stats: { ...item.stats, [key]: value } };
    }));
  }

  return (
    <div className="min-h-screen bg-[#000109] p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">About Manager</h1>
            <p className="mt-1 text-sm text-slate-400">Edit about page content</p>
          </div>
          <button onClick={fetchAbout} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-rose-500" /></div> : (
          <div className="space-y-6">
            {aboutData.map(section => (
              <div key={section.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white capitalize">{section.section} Section</h2>
                  <button onClick={() => handleSave(section)} disabled={saving}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2 text-sm text-white disabled:opacity-50">
                    <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save"}
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">Title</label>
                    <input value={section.title} onChange={e => updateField(section.id, "title", e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-rose-500/50 focus:outline-none" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-300">Content</label>
                    <textarea value={section.content} onChange={e => updateField(section.id, "content", e.target.value)} rows={6}
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-rose-500/50 focus:outline-none" />
                  </div>

                  {section.stats && (
                    <div className="rounded-xl border border-white/5 bg-white/5 p-4">
                      <p className="mb-3 text-sm font-medium text-slate-300">Stats</p>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {Object.entries(section.stats).map(([key, value]) => (
                          <div key={key}>
                            <label className="mb-1 block text-xs text-slate-500 capitalize">{key}</label>
                            <input value={String(value)} onChange={e => updateStats(section.id, key, e.target.value)}
                              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-rose-500/50 focus:outline-none" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}