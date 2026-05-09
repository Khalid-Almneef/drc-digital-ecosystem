"use client";

import Image from "next/image";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLang } from "@/contexts/LanguageContext";

export function AdminLink({ href, label }: { href: string; label: string }) {
  const { isAnyLeader } = useAuth();
  if (!isAnyLeader) return null;
  return (
    <Link
      href={href}
      className="hidden md:inline-flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors shrink-0"
    >
      <Pencil size={11} />
      {label}
    </Link>
  );
}

export function ContentImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className: string;
}) {
  if (src.startsWith("/")) {
    return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`absolute inset-0 h-full w-full ${className}`} loading={priority ? "eager" : "lazy"} />;
}
