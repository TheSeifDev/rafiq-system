"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Users, Filter, User } from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  photo: string | null;
  role: string | null;
  skill_type: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [filter, setFilter] = useState<"all" | "soft" | "hard">("all");
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);
    const { data } = await supabase
      .from("team_members")
      .select("id, name, photo, role, skill_type")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    setMembers(data || []);
    setLoading(false);
  }

  const filtered = filter === "all" ? members : members.filter(m => m.skill_type === filter);
  const softCount = members.filter(m => m.skill_type === "soft").length;
  const hardCount = members.filter(m => m.skill_type === "hard").length;

  return (
    <div className="min-h-screen bg-[#000109]">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/10 bg-white/[0.02] py-16">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 text-center">
          <h1 className="text-4xl font-bold text-white">Our Team</h1>
          <p className="mt-3 text-lg text-slate-400">
            Meet the {members.length} talented engineers behind Phantoms
          </p>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {members.length} Total
            </span>
            <span className="flex items-center gap-1 text-blue-400">
              <Filter className="h-4 w-4" />
              {softCount} Soft Skills
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <Filter className="h-4 w-4" />
              {hardCount} Hard Skills
            </span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex justify-center gap-3">
          {(["all", "soft", "hard"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-xl px-6 py-2.5 text-sm font-medium transition-all ${
                filter === f
                  ? "bg-gradient-to-r from-rose-600 to-rose-500 text-white shadow-lg shadow-rose-500/25"
                  : "border border-white/10 bg-white/5 text-slate-400 hover:bg-white/10"
              }`}>
              {f === "all" ? "All Members" : f === "soft" ? "Soft Skills" : "Hard Skills"}
              <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs">
                {f === "all" ? members.length : f === "soft" ? softCount : hardCount}
              </span>
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map(member => (
              <div key={member.id} className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl transition-all hover:border-white/20 hover:-translate-y-1">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="h-28 w-28 rounded-full object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/5 transition-transform duration-300 group-hover:scale-110">
                        <User className="h-12 w-12 text-slate-500" />
                      </div>
                    )}
                    <span className={`absolute -bottom-1 -right-1 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                      member.skill_type === "soft"
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                      {member.skill_type}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-white">{member.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{member.role || "Team Member"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}