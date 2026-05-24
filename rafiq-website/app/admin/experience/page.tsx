"use client";

import { useState, useEffect, useCallback } from "react";
import { Experience } from "@/src/types/database";
import { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Pencil,
  Trash2,
  Plus,
  Loader2,
  Building2,
  MapPin,
  Calendar,
  ArrowUp,
  ArrowDown,
  Briefcase,
  Clock,
  TrendingUp,
  Search,
  LayoutList,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";

export default function ExperiencePage() {
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchExperiences = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/experience");
      const result = await response.json();

      if (result.success) {
        setExperiences(result.data);
      } else {
        toast.error("Failed to load experiences");
      }
    } catch (error) {
      toast.error("Error fetching experiences");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExperiences();
  }, [fetchExperiences]);

  const deleteExperience = async (id: string) => {
    if (!confirm("Are you sure you want to delete this experience?")) return;

    try {
      const response = await fetch(`/api/admin/experience?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Experience deleted successfully");
        fetchExperiences();
      } else {
        toast.error(result.error || "Failed to delete experience");
      }
    } catch (error) {
      toast.error("Error deleting experience");
    }
  };

  const moveOrder = async (id: string, direction: "up" | "down") => {
    const currentIndex = experiences.findIndex((e: Experience) => e.id === id);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= experiences.length) return;

    const current = experiences[currentIndex];
    const swap = experiences[newIndex];

    try {
      await Promise.all([
        fetch("/api/admin/experience", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: current.id, order_index: swap.order_index }),
        }),
        fetch("/api/admin/experience", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: swap.id, order_index: current.order_index }),
        }),
      ]);

      toast.success("Order updated");
      fetchExperiences();
    } catch (error) {
      toast.error("Error updating order");
    }
  };

  // Stats
  const currentJobs = experiences.filter((e: Experience) => e.is_current).length;
  const pastJobs = experiences.filter((e: Experience) => !e.is_current).length;
  const totalYears = experiences.reduce((acc: number, e: Experience) => {
    const start = new Date(e.start_date).getFullYear();
    const end = e.end_date ? new Date(e.end_date).getFullYear() : new Date().getFullYear();
    return acc + (end - start);
  }, 0);

  const stats = [
    {
      label: "Total Jobs",
      value: experiences.length,
      icon: Briefcase,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10",
    },
    {
      label: "Current",
      value: currentJobs,
      icon: TrendingUp,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
    },
    {
      label: "Past",
      value: pastJobs,
      icon: Clock,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10",
    },
    {
      label: "Years Exp.",
      value: totalYears,
      icon: Calendar,
      color: "text-rose-400",
      bgColor: "bg-rose-500/10",
    },
  ];

  const columns: ColumnDef<Experience>[] = [
    {
      accessorKey: "order_index",
      header: "Order",
      cell: ({ row }: { row: { original: Experience; index: number } }) => (
        <div className="flex flex-col items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => moveOrder(row.original.id, "up")}
            disabled={row.index === 0}
            className="h-5 w-5 p-0 text-slate-500 hover:text-white disabled:opacity-30"
          >
            <ArrowUp className="h-3 w-3" />
          </Button>
          <span className="text-xs font-medium text-slate-400">
            {row.original.order_index}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => moveOrder(row.original.id, "down")}
            disabled={row.index === experiences.length - 1}
            className="h-5 w-5 p-0 text-slate-500 hover:text-white disabled:opacity-30"
          >
            <ArrowDown className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      accessorKey: "company",
      header: "Company & Role",
      cell: ({ row }: { row: { original: Experience } }) => (
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
            {row.original.logo_url ? (
              <Image
                src={row.original.logo_url}
                alt={row.original.company}
                fill
                className="object-cover"
              />
            ) : (
              <Building2 className="h-5 w-5 m-auto text-slate-500" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-white">{row.original.company}</span>
            <span className="text-xs text-rose-400">{row.original.role}</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }: { row: { original: Experience } }) => (
        <div className="flex items-center gap-2 text-slate-400">
          <MapPin className="h-3.5 w-3.5" />
          {row.original.location || "Remote"}
        </div>
      ),
    },
    {
      accessorKey: "duration",
      header: "Duration",
      cell: ({ row }: { row: { original: Experience } }) => (
        <div className="flex items-center gap-2 text-slate-400">
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-sm">
            {new Date(row.original.start_date).toLocaleDateString("en-US", {
              month: "short",
              year: "numeric",
            })}
            {" - "}
            {row.original.is_current
              ? "Present"
              : row.original.end_date
              ? new Date(row.original.end_date).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })
              : "Present"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "is_current",
      header: "Status",
      cell: ({ row }: { row: { original: Experience } }) => (
        <Badge
          variant={row.original.is_current ? "default" : "secondary"}
          className={
            row.original.is_current
              ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
              : "bg-slate-700 text-slate-400 hover:bg-slate-600"
          }
        >
          {row.original.is_current ? "Current" : "Past"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }: { row: { original: Experience } }) => (
        <div className="flex items-center gap-2">
          <Link href={`/admin/experience/edit/${row.original.id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteExperience(row.original.id)}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-32 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Experience</h1>
          <p className="mt-1 text-slate-400">
            Manage your work experience and career history
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                viewMode === "table"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("timeline")}
              className={`rounded-md px-3 py-1.5 text-sm ${
                viewMode === "timeline"
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
            </button>
          </div>

          <Link href="/admin/experience/new">
            <Button className="bg-rose-600 hover:bg-rose-700 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Experience
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`rounded-xl border border-slate-800 ${stat.bgColor} p-4`}
            >
              <div className="flex items-center gap-3">
                <div className={`rounded-lg ${stat.bgColor} p-2`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                  <p className="text-sm text-slate-400">{stat.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-sm text-white placeholder:text-slate-500 focus:border-rose-500 focus:outline-none"
        />
      </div>

      {/* Content */}
      {viewMode === "table" ? (
        <DataTable columns={columns} data={experiences} searchKey="company" />
      ) : (
        <div className="space-y-4">
          {experiences.map((exp: Experience, index: number) => (
            <div
              key={exp.id}
              className="flex items-start gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-4"
            >
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-sm font-medium text-slate-400">
                  {index + 1}
                </div>
                {index < experiences.length - 1 && (
                  <div className="mt-2 h-12 w-px bg-slate-800" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
                    {exp.logo_url ? (
                      <Image src={exp.logo_url} alt={exp.company} fill className="object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 m-auto text-slate-500" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{exp.company}</h3>
                    <p className="text-sm text-rose-400">{exp.role}</p>
                  </div>
                  <Badge
                    className={
                      exp.is_current
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-slate-700 text-slate-400"
                    }
                  >
                    {exp.is_current ? "Current" : "Past"}
                  </Badge>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {exp.location || "Remote"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(exp.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                    {" - "}
                    {exp.is_current
                      ? "Present"
                      : exp.end_date
                      ? new Date(exp.end_date).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })
                      : "Present"}
                  </span>
                </div>
                {exp.description && (
                  <p className="mt-2 text-sm text-slate-400">{exp.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Link href={`/admin/experience/edit/${exp.id}`}>
                  <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteExperience(exp.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}