"use client";

import { useState, useEffect } from "react";
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Loader2, Save, X,
  User, Filter, Users
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  photo: string | null;
  role: string | null;
  skill_type: string;
  is_active: boolean;
  display_order: number;
}

interface FormData {
  name: string;
  photo: string;
  role: string | null;
  skill_type: string;
  is_active: boolean;
  display_order: number;
}

export default function TeamManager() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [filter, setFilter] = useState<"all" | "soft" | "hard">("all");

  const [formData, setFormData] = useState<FormData>({
    name: "", photo: "", role: "", skill_type: "soft", is_active: true, display_order: 0,
  });

  useEffect(() => { fetchMembers(); }, []);

  async function fetchMembers() {
    setLoading(true);
    const res = await fetch("/api/team");
    const result = await res.json();
    if (result.success) setMembers(result.data || []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editingMember ? "PUT" : "POST";
    const body = editingMember ? { ...formData, id: editingMember.id } : formData;

    const res = await fetch("/api/team", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await res.json();

    if (result.success) {
      setShowForm(false);
      setEditingMember(null);
      resetForm();
      fetchMembers();
    } else {
      alert(result.error || "Failed");
    }
  }

  async function toggleActive(id: string, current: boolean) {
    const res = await fetch("/api/team", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_active: !current }),
    });
    if (res.ok) fetchMembers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this member?")) return;
    const res = await fetch(`/api/team?id=${id}`, { method: "DELETE" });
    if (res.ok) fetchMembers();
  }

  function resetForm() { setFormData({ name: "", photo: "", role: "", skill_type: "soft", is_active: true, display_order: 0 }); }

  function startEdit(member: TeamMember) {
    setEditingMember(member);
    setFormData({
      name: member.name,
      photo: member.photo || "",
      role: member.role,
      skill_type: member.skill_type,
      is_active: member.is_active,
      display_order: member.display_order,
    });
    setShowForm(true);
  }

  const filtered = filter === "all" ? members : members.filter(m => m.skill_type === filter);
  const softCount = members.filter(m => m.skill_type === "soft" && m.is_active).length;
  const hardCount = members.filter(m => m.skill_type === "hard" && m.is_active).length;

  return (
    <div className="min-h-screen bg-[#000109] p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Team Manager</h1>
            <p className="mt-1 text-sm text-slate-400">{members.length} members total</p>
          </div>
          <button onClick={() => { setEditingMember(null); resetForm(); setShowForm(!showForm); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-500/25">
            <Plus className="h-4 w-4" /> Add Member
          </button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
            <p className="text-2xl font-bold text-white">{members.filter(m => m.is_active).length}</p>
            <p className="text-xs text-slate-400">Active Members</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
            <p className="text-2xl font-bold text-blue-400">{softCount}</p>
            <p className="text-xs text-slate-400">Soft Skills</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center">
            <p className="text-2xl font-bold text-amber-400">{hardCount}</p>
            <p className="text-xs text-slate-400">Hard Skills</p>
          </div>
        </div>

        {/* Filter */}
        <div className="mb-6 flex gap-2">
          {(["all", "soft", "hard"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                filter === f
                  ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-500/25"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
              }`}>
              {f === "all" ? <Users className="inline h-4 w-4 mr-1" /> : <Filter className="inline h-4 w-4 mr-1" />}
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {showForm && (
          <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">{editingMember ? "Edit Member" : "New Member"}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Name</label>
                <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rose-500/50 focus:outline-none" placeholder="John Doe" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Role</label>
                <input value={formData.role ?? ""} onChange={e => setFormData({...formData, role: e.target.value || null})}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rose-500/50 focus:outline-none" placeholder="Developer" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Photo URL</label>
                <input value={formData.photo} onChange={e => setFormData({...formData, photo: e.target.value})}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-rose-500/50 focus:outline-none" placeholder="https://..." />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">Skill Type</label>
                <select value={formData.skill_type} onChange={e => setFormData({...formData, skill_type: e.target.value})}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-rose-500/50 focus:outline-none">
                  <option value="soft">Soft Skills</option>
                  <option value="hard">Hard Skills</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-rose-500" />
                <label htmlFor="is_active" className="text-sm text-slate-300">Active</label>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-white/10 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5">Cancel</button>
                <button type="submit" className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2.5 text-sm text-white"><Save className="h-4 w-4" /> {editingMember ? "Update" : "Create"}</button>
              </div>
            </form>
          </div>
        )}

        {loading ? <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-rose-500" /></div> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(member => (
              <div key={member.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-xl transition-all hover:border-white/20">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    {member.photo ? (
                      <img src={member.photo} alt={member.name} className="h-24 w-24 rounded-full object-cover transition-transform duration-300 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/5 transition-transform duration-300 group-hover:scale-110">
                        <User className="h-10 w-10 text-slate-500" />
                      </div>
                    )}
                    <span className={`absolute -bottom-1 -right-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      member.skill_type === "soft" ? "bg-blue-500/20 text-blue-400" : "bg-amber-500/20 text-amber-400"
                    }`}>
                      {member.skill_type}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                  <p className="text-sm text-slate-400">{member.role || "Member"}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <button onClick={() => toggleActive(member.id, member.is_active)} className={`rounded-lg p-2 ${member.is_active ? "text-emerald-400 hover:bg-emerald-500/10" : "text-slate-500 hover:bg-white/5"}`}>
                      {member.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button onClick={() => startEdit(member)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(member.id)} className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}