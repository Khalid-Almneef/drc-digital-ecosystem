"use client";

import { useRef, useState, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AdminLink } from "@/lib/ui-helpers";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { projectStatusKey } from "@/hooks/useHomeData";
import type { FeaturedProject } from "@/hooks/useHomeData";

interface ProjectsGridProps {
  visible: boolean;
  projects: FeaturedProject[];
  adminManage: string;
  lang: string;
  t: (key: string) => string;
}

export function ProjectsGrid({ visible, projects, adminManage, lang, t }: ProjectsGridProps) {
  if (!visible) return null;

  return (
    <section className="relative px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-end justify-between gap-4">
          <SectionHeader label={t("section.projects.label")} title={t("section.projects.title")} description={t("section.projects.desc")} />
          <div className="flex items-center gap-4">
            <AdminLink href="/dashboard/innovation" label={adminManage} />
            <Link href="/projects" className="hidden items-center gap-1.5 text-sm text-primary hover:text-primary-bright md:flex transition-colors">
              {t("section.projects.viewall")}
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {projects.map((project, index) => (
            <ProjectCard key={project.projectId} project={project} index={index} lang={lang} t={t} />
          ))}
        </div>

        <div className="mt-8 text-center md:hidden">
          <Link href="/projects" className="btn-secondary inline-flex items-center gap-1.5 px-6 py-2.5 text-sm">
            {t("section.projects.viewall")}
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}

function ProjectCard({ project, index, lang, t }: { project: FeaturedProject; index: number; lang: string; t: (key: string) => string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.8, y: 18 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0.8, y: 18 }}
      transition={{ duration: 0.55, delay: Math.min(index, 6) * 0.08, ease: [0.16, 1, 0.3, 1] }}
      className="card-feature overflow-hidden group"
    >
      <div className="relative h-52 overflow-hidden bg-gradient-to-br from-surface-elevated via-secondary/[0.06] to-primary/[0.04]">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/[0.08] blur-[48px] group-hover:bg-primary/[0.12] transition-colors duration-500" />
        <div className="absolute left-5 top-5">
          <span className={`badge ${project.status === "completed" ? "badge-success" : "badge-warning"}`}>
            {t(projectStatusKey(project.status))}
          </span>
        </div>
        <div className="absolute bottom-4 left-4">
          <span className="badge badge-primary">{project.category}</span>
        </div>
        {/* Decorative engineering lines */}
        <svg className="absolute right-4 bottom-4 w-24 h-24 opacity-10 group-hover:opacity-20 transition-opacity" viewBox="0 0 100 100">
          <line x1="0" y1="100" x2="100" y2="0" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
          <line x1="30" y1="100" x2="100" y2="30" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
          <circle cx="100" cy="0" r="2" fill="currentColor" className="text-primary" />
        </svg>
      </div>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground">{project.title}</h3>
        <p className="mt-3 text-sm leading-7 text-muted">{project.description}</p>
      </div>
    </motion.div>
  );
}
