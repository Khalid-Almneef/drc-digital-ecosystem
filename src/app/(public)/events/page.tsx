"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { PageHero } from "@/components/ui/PageHero";
import { PublicCustomSegments } from "@/components/ui/PublicCustomSegments";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { useLang } from "@/contexts/LanguageContext";
import { api } from "@/lib/client";

// ── Types ──────────────────────────────────────────────────────────────────

interface UpcomingEvent {
  eventId: number | string;
  title: string;
  description: string | null;
  type: "competition" | "workshop" | "meetup" | "general" | string;
  category: string | null;
  startTime: string;
  endTime: string | null;
  location: string | null;
  seatsAvailable: number | null;
  imageUrl: string | null;
}

type PastEvent = Omit<UpcomingEvent, "seatsAvailable">;

// ── Helpers ────────────────────────────────────────────────────────────────

function eventTypeBadgeClass(type: string): string {
  return type === "competition" ? "badge badge-warning"
       : type === "workshop"    ? "badge badge-primary"
       : type === "meetup"      ? "badge badge-info"
       : "badge";
}

function eventTypeKey(type: string): string {
  return type === "competition" ? "events.type.competition"
       : type === "workshop"    ? "events.type.workshop"
       : type === "meetup"      ? "events.type.meetup"
       : "events.type.general";
}

// Force Gregorian calendar in Arabic — some Intl implementations default ar-SA to Hijri
const ARABIC_LOCALE = "ar-u-ca-gregory";

function formatEventDate(iso: string, lang: "en" | "ar"): string {
  return new Date(iso).toLocaleDateString(lang === "ar" ? ARABIC_LOCALE : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventTime(startIso: string, endIso: string | null, lang: "en" | "ar"): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const locale = lang === "ar" ? ARABIC_LOCALE : "en-US";
  const start = new Date(startIso).toLocaleTimeString(locale, opts);
  if (!endIso) return start;
  return `${start} – ${new Date(endIso).toLocaleTimeString(locale, opts)}`;
}

// Returns ASCII day number regardless of locale
function eventDayNumber(iso: string): string {
  return new Date(iso).getDate().toString();
}

function eventMonthShort(iso: string, lang: "en" | "ar"): string {
  return new Date(iso).toLocaleDateString(lang === "ar" ? ARABIC_LOCALE : "en-US", {
    month: "short",
  });
}

// Empty by default — events come from /api/events/public, which the
// Logistics committee populates from their dashboard. The empty state
// renders cleanly when the DB has no upcoming events yet.
const seedUpcoming: UpcomingEvent[] = [];

// ── Curated achievements ───────────────────────────────────────────────────
// Replace with real competition history when available.

// ── Page ───────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const { t, lang } = useLang();
  const [upcoming, setUpcoming] = useState<UpcomingEvent[]>(seedUpcoming);
  const [past, setPast] = useState<PastEvent[]>([]);

  useEffect(() => {
    api.get<{ upcoming: UpcomingEvent[]; past: PastEvent[] }>("/api/events/public")
      .then((d) => {
        if (d?.upcoming?.length) setUpcoming(d.upcoming);
        if (d?.past?.length) setPast(d.past);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="relative">
      <PageHero
        label={t("events.hero.label")}
        title={t("events.hero.title")}
        accentText={t("events.hero.accent")}
        description={t("events.hero.desc")}
      />

      {/* ═══ UPCOMING EVENTS ═══ */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            label={t("events.upcoming.label")}
            title={t("events.upcoming.title")}
            description={t("events.upcoming.desc")}
          />

          <div className="mt-16 space-y-6">
            {upcoming.length === 0 ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-muted py-12"
              >
                {t("events.upcoming.empty")}
              </motion.p>
            ) : (
              upcoming.map((event, i) => (
                <motion.div
                  key={event.eventId}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as const }}
                  className="glass-card p-6 md:p-8 card-hover group"
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-6">
                    {/* Date badge */}
                    <div className="shrink-0 w-20 text-center">
                      <div className="text-3xl font-bold text-foreground leading-none">
                        {eventDayNumber(event.startTime)}
                      </div>
                      <div className="text-sm text-primary font-medium mt-1">
                        {eventMonthShort(event.startTime, lang)}
                      </div>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-2">
                            {event.title}
                          </h3>
                          {event.description && (
                            <p className="text-sm text-muted leading-relaxed mb-4">
                              {event.description}
                            </p>
                          )}
                        </div>
                        <span
                          className={`shrink-0 text-xs font-medium px-3 py-1 rounded-full border ${eventTypeBadgeClass(event.type)}`}
                        >
                          {t(eventTypeKey(event.type))}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-xs text-muted">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-primary/60" />
                          {formatEventDate(event.startTime, lang)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={13} className="text-primary/60" />
                          {formatEventTime(event.startTime, event.endTime, lang)}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin size={13} className="text-primary/60" />
                            {event.location}
                          </span>
                        )}
                        {typeof event.seatsAvailable === "number" && (
                          <span className="flex items-center gap-1.5">
                            <Users size={13} className="text-primary/60" />
                            {event.seatsAvailable === 0
                              ? t("events.upcoming.seats_full")
                              : `${event.seatsAvailable} ${t("events.upcoming.seats")}`}
                          </span>
                        )}
                      </div>

                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      <div className="section-divider mx-6" />

      {/* ═══ RECENT EVENTS (API-driven) ═══ */}
      <section className="relative py-24 px-6">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            label={t("events.recent.label")}
            title={t("events.recent.title")}
            description={t("events.recent.desc")}
          />

          <div className="mt-16">
            {past.length === 0 ? (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-muted py-12"
              >
                {t("events.recent.empty")}
              </motion.p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {past.map((event, i) => (
                  <motion.div
                    key={event.eventId}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as const }}
                    className="glass-card p-6 card-hover group"
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <span className="text-xs text-muted">
                        {formatEventDate(event.startTime, lang)}
                      </span>
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ms-auto ${eventTypeBadgeClass(event.type)}`}
                      >
                        {t(eventTypeKey(event.type))}
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-foreground mb-2">{event.title}</h4>
                    {event.description && (
                      <p className="text-xs text-muted leading-relaxed mb-3 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    {event.location && (
                      <p className="text-xs text-muted flex items-center gap-1 mt-auto">
                        <MapPin size={11} /> {event.location}
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ WORKSHOPS CTA ═══ */}
      <section className="relative py-12 px-6">
        <div className="mx-auto max-w-7xl text-center">
          <Link
            href="/workshops"
            className="text-sm text-primary hover:underline underline-offset-4"
          >
            {t("events.cta.workshops")}
          </Link>
        </div>
      </section>

      <PublicCustomSegments page="events" />
    </div>
  );
}
