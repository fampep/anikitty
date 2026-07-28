"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  Clock,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Link2,
  Mail,
  MessageSquare,
  Scale,
  Server,
  Shield,
} from "lucide-react";
import Container from "@/components/layout/container";
import DmcaSearch from "@/components/dmca/dmca-search";
import DmcaSidebar from "@/components/dmca/dmca-sidebar";
import { DmcaCallout, DmcaSectionHeading } from "@/components/dmca/dmca-callout";
import DmcaChecklist from "@/components/dmca/dmca-checklist";
import DmcaSteps from "@/components/dmca/dmca-steps";
import DmcaTimeline from "@/components/dmca/dmca-timeline";
import DmcaFaq from "@/components/dmca/dmca-faq";
import DmcaTemplate from "@/components/dmca/dmca-template";
import DmcaContactCard from "@/components/dmca/dmca-contact";
import { DmcaHighlight } from "@/components/dmca/dmca-highlight";
import {
  DMCA_CHECKLIST,
  DMCA_COUNTER_TIMELINE,
  DMCA_FAQ_ITEMS,
  DMCA_HOST_ITEMS,
  DMCA_PROCESS_TIMELINE,
  DMCA_SUBMIT_STEPS,
  DMCA_TOC,
  getDmcaSearchBlob,
} from "@/lib/dmca/content";
import type { DmcaSectionId } from "@/lib/dmca/types";
import { DMCA_EMAIL, DMCA_LAST_UPDATED } from "@/constants/site-meta";
import { ROUTES } from "@/constants/routes";
import { useT } from "@/providers/i18n-provider";
import { cn } from "@/lib/core/utils";

const SEARCH_BLOBS = getDmcaSearchBlob();

const HOST_ICONS = {
  metadata: FileText,
  artwork: ImageIcon,
  ugc: MessageSquare,
  links: Link2,
} as const;

function sectionMatches(id: string, q: string) {
  if (!q) return true;
  const blob = SEARCH_BLOBS.find((b) => b.id === id);
  return blob ? blob.text.toLowerCase().includes(q) : false;
}

function faqMatches(q: string) {
  if (!q) return DMCA_FAQ_ITEMS;
  return DMCA_FAQ_ITEMS.filter((item) => {
    const hay = `${item.question}\n${item.answer}\n${item.tags.join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}

export default function DmcaContent() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState<DmcaSectionId | null>("overview");

  const normalizedQuery = query.trim().toLowerCase();
  const highlight = normalizedQuery.length >= 2 ? normalizedQuery : undefined;

  const filteredFaq = useMemo(() => faqMatches(normalizedQuery), [normalizedQuery]);

  const visibleIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of DMCA_TOC) {
      if (item.id === "faq") {
        if (filteredFaq.length > 0 && sectionMatches("faq", normalizedQuery)) set.add("faq");
        continue;
      }
      if (sectionMatches(item.id, normalizedQuery)) set.add(item.id);
    }
    // If the query matches FAQ items specifically, keep FAQ visible
    if (normalizedQuery && filteredFaq.length > 0) set.add("faq");
    return set;
  }, [normalizedQuery, filteredFaq.length]);

  const navigateSection = useCallback((id: DmcaSectionId) => {
    setActiveId(id);
    window.history.replaceState(null, "", `${ROUTES.DMCA}#${id}`);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      if (DMCA_TOC.some((s) => s.id === hash)) {
        setActiveId(hash as DmcaSectionId);
        document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      if (DMCA_FAQ_ITEMS.some((f) => f.id === hash)) {
        setActiveId("faq");
        requestAnimationFrame(() => {
          document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  useEffect(() => {
    if (normalizedQuery) return;
    const sectionEls = DMCA_TOC.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => Boolean(el),
    );
    if (sectionEls.length === 0 || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.id;
        if (id && DMCA_TOC.some((s) => s.id === id)) {
          setActiveId(id as DmcaSectionId);
        }
      },
      { rootMargin: "-20% 0px -65% 0px", threshold: [0, 0.25, 0.5] },
    );
    for (const el of sectionEls) observer.observe(el);
    return () => observer.disconnect();
  }, [normalizedQuery, visibleIds]);

  const lastUpdated = new Date(DMCA_LAST_UPDATED).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const empty = visibleIds.size === 0;

  return (
    <div className="min-h-screen pb-24 pt-8">
      <Container className="max-w-6xl">
        <header className="mb-6 md:mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="h-6 w-0.5 shrink-0 bg-muted/30 dark:bg-white/35" />
            <Scale className="h-5 w-5 text-muted-foreground dark:text-white/50" aria-hidden />
            <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white md:text-3xl">
              {t("dmca.title")}
            </h1>
          </div>
          <p className="ml-[1.375rem] max-w-2xl pl-8 font-mono text-sm leading-relaxed text-muted-foreground dark:text-white/35">
            {t("dmca.subtitle")} {t("dmca.lastUpdated", { date: lastUpdated })}.
          </p>
        </header>

        <DmcaSearch
          value={query}
          onChange={setQuery}
          sticky
          resultCount={normalizedQuery ? visibleIds.size : null}
          className="mb-6 max-w-2xl md:mb-8"
        />

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
          {!empty ? (
            <DmcaSidebar
              items={DMCA_TOC}
              activeId={activeId}
              visibleIds={visibleIds}
              onNavigate={navigateSection}
            />
          ) : (
            <div className="hidden lg:block" />
          )}

          <div className="min-w-0">
            {empty ? (
              <div className="site-panel animate-in fade-in space-y-4 p-6 text-center duration-200 sm:p-8">
                <p className="font-mono text-sm text-muted-foreground dark:text-white/40">
                  {t("dmca.noSearchResults")}
                </p>
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="site-ghost-btn px-3 py-2 text-xs"
                >
                  {t("dmca.clearSearch")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-12 md:gap-14">
                {visibleIds.has("overview") ? (
                  <section
                    id="overview"
                    aria-labelledby="overview-heading"
                    className="scroll-mt-28 animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    <DmcaSectionHeading
                      id="overview"
                      number="01"
                      title={t("dmca.sections.overview")}
                      icon={<Shield className="h-4 w-4" />}
                      highlight={highlight}
                    />
                    <DmcaCallout tone="info" icon={<Server className="h-4 w-4" />} className="mb-4">
                      <p>
                        <DmcaHighlight
                          text={t("dmca.overviewLead")}
                          highlight={highlight}
                        />
                      </p>
                    </DmcaCallout>
                    <p className="text-sm leading-relaxed text-muted-foreground dark:text-white/55">
                      <DmcaHighlight text={t("dmca.overviewBody")} highlight={highlight} />
                    </p>
                  </section>
                ) : null}

                {visibleIds.has("what-we-host") ? (
                  <section
                    id="what-we-host"
                    aria-labelledby="what-we-host-heading"
                    className="scroll-mt-28 animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    <DmcaSectionHeading
                      id="what-we-host"
                      number="02"
                      title={t("dmca.sections.whatWeHost")}
                      icon={<Server className="h-4 w-4" />}
                      highlight={highlight}
                    />
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground dark:text-white/55">
                      <DmcaHighlight text={t("dmca.whatWeHostIntro")} highlight={highlight} />
                    </p>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" role="list">
                      {DMCA_HOST_ITEMS.map((item) => {
                        const Icon = HOST_ICONS[item.id as keyof typeof HOST_ICONS] ?? FileText;
                        return (
                          <li key={item.id} className="site-panel flex flex-col gap-2 p-4 sm:p-5">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Icon
                                  className="h-4 w-4 text-muted-foreground dark:text-white/40"
                                  aria-hidden
                                />
                                <h3 className="text-sm font-semibold text-foreground dark:text-white/85">
                                  <DmcaHighlight text={item.title} highlight={highlight} />
                                </h3>
                              </div>
                              <span
                                className={cn(
                                  "rounded-md px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em]",
                                  item.reportable
                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-300/85"
                                    : "bg-muted/60 text-muted-foreground dark:bg-white/[0.06] dark:text-white/40",
                                )}
                              >
                                {item.reportable
                                  ? t("dmca.mayBeReportable")
                                  : t("dmca.generallyNotReportable")}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground dark:text-white/50">
                              <DmcaHighlight text={item.description} highlight={highlight} />
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                    <DmcaCallout
                      tone="caution"
                      icon={<AlertTriangle className="h-4 w-4" />}
                      className="mt-4"
                    >
                      <p>
                        <DmcaHighlight text={t("dmca.whatWeHostNote")} highlight={highlight} />
                      </p>
                    </DmcaCallout>
                  </section>
                ) : null}

                {visibleIds.has("copyright-policy") ? (
                  <section
                    id="copyright-policy"
                    aria-labelledby="copyright-policy-heading"
                    className="scroll-mt-28 animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    <DmcaSectionHeading
                      id="copyright-policy"
                      number="03"
                      title={t("dmca.sections.copyrightPolicy")}
                      icon={<FileText className="h-4 w-4" />}
                      highlight={highlight}
                    />
                    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground dark:text-white/55">
                      <p>
                        <DmcaHighlight text={t("dmca.policyP1")} highlight={highlight} />
                      </p>
                      <p>
                        <DmcaHighlight text={t("dmca.policyP2")} highlight={highlight} />
                      </p>
                    </div>
                    <DmcaCallout
                      tone="warning"
                      icon={<AlertTriangle className="h-4 w-4" />}
                      className="mt-4"
                    >
                      <p>
                        <DmcaHighlight text={t("dmca.policyMisuse")} highlight={highlight} />
                      </p>
                    </DmcaCallout>
                  </section>
                ) : null}

                {visibleIds.has("how-to-submit") ? (
                  <section
                    id="how-to-submit"
                    aria-labelledby="how-to-submit-heading"
                    className="scroll-mt-28 animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    <DmcaSectionHeading
                      id="how-to-submit"
                      number="04"
                      title={t("dmca.sections.howToSubmit")}
                      icon={<Mail className="h-4 w-4" />}
                      highlight={highlight}
                    />
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground dark:text-white/55">
                      <DmcaHighlight text={t("dmca.submitIntro")} highlight={highlight} />
                    </p>
                    <DmcaSteps steps={DMCA_SUBMIT_STEPS} highlight={highlight} className="mb-6" />

                    <h3 className="mb-3 text-sm font-semibold text-foreground dark:text-white/85">
                      {t("dmca.requiredChecklist")}
                    </h3>
                    <DmcaChecklist items={DMCA_CHECKLIST} highlight={highlight} className="mb-6" />

                    <h3 className="mb-3 text-sm font-semibold text-foreground dark:text-white/85">
                      {t("dmca.processingTimeline")}
                    </h3>
                    <DmcaCallout tone="warning" icon={<Clock className="h-4 w-4" />} className="mb-4">
                      <p>
                        <DmcaHighlight text={t("dmca.processingNote")} highlight={highlight} />
                      </p>
                    </DmcaCallout>
                    <DmcaTimeline
                      steps={DMCA_PROCESS_TIMELINE}
                      highlight={highlight}
                      className="mb-6"
                    />

                    <DmcaTemplate />
                  </section>
                ) : null}

                {visibleIds.has("counter-notification") ? (
                  <section
                    id="counter-notification"
                    aria-labelledby="counter-notification-heading"
                    className="scroll-mt-28 animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    <DmcaSectionHeading
                      id="counter-notification"
                      number="05"
                      title={t("dmca.sections.counterNotification")}
                      icon={<Scale className="h-4 w-4" />}
                      highlight={highlight}
                    />
                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground dark:text-white/55">
                      <DmcaHighlight text={t("dmca.counterIntro")} highlight={highlight} />
                    </p>
                    <DmcaTimeline steps={DMCA_COUNTER_TIMELINE} highlight={highlight} />
                  </section>
                ) : null}

                {visibleIds.has("repeat-infringer") ? (
                  <section
                    id="repeat-infringer"
                    aria-labelledby="repeat-infringer-heading"
                    className="scroll-mt-28 animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    <DmcaSectionHeading
                      id="repeat-infringer"
                      number="06"
                      title={t("dmca.sections.repeatInfringer")}
                      icon={<Ban className="h-4 w-4" />}
                      highlight={highlight}
                    />
                    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground dark:text-white/55">
                      <p>
                        <DmcaHighlight text={t("dmca.repeatP1")} highlight={highlight} />
                      </p>
                      <p>
                        <DmcaHighlight text={t("dmca.repeatP2")} highlight={highlight} />
                      </p>
                    </div>
                  </section>
                ) : null}

                {visibleIds.has("faq") ? (
                  <section
                    id="faq"
                    aria-labelledby="faq-heading"
                    className="scroll-mt-28 animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    <DmcaSectionHeading
                      id="faq"
                      number="07"
                      title={t("dmca.sections.faq")}
                      icon={<HelpCircle className="h-4 w-4" />}
                      highlight={highlight}
                    />
                    {filteredFaq.length === 0 ? (
                      <p className="font-mono text-sm text-muted-foreground dark:text-white/40">
                        {t("dmca.noFaqResults")}
                      </p>
                    ) : (
                      <DmcaFaq items={filteredFaq} highlight={highlight} />
                    )}
                  </section>
                ) : null}

                {visibleIds.has("contact") ? (
                  <section
                    id="contact"
                    aria-labelledby="contact-heading"
                    className="scroll-mt-28 animate-in fade-in slide-in-from-bottom-1 duration-300"
                  >
                    <DmcaSectionHeading
                      id="contact"
                      number="08"
                      title={t("dmca.sections.contact")}
                      icon={<Mail className="h-4 w-4" />}
                      highlight={highlight}
                    />
                    <DmcaContactCard highlight={highlight} />
                    <p className="mt-3 font-mono text-xs text-muted-foreground/70 dark:text-white/25">
                      {DMCA_EMAIL}
                    </p>
                  </section>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
