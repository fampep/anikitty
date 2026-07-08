"use client";

import Container from "@/components/layout/container";
import { Scale, Mail, Clock, FileText, Server, AlertTriangle } from "lucide-react";

const DMCA_EMAIL = "anikittymoe@proton.me";

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="text-violet-400/70">{icon}</span>
        <h2 className="text-lg font-bold text-foreground dark:text-white/90">{title}</h2>
      </div>
      <div className="text-sm text-muted-foreground dark:text-white/55 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

export default function DmcaContent() {
  const lastUpdated = new Date().toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen pt-8 pb-24">
      <Container className="max-w-3xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-0.5 h-6 bg-muted/30 dark:bg-white/35 shrink-0" />
          <Scale className="w-5 h-5 text-muted-foreground dark:text-white/50" />
          <h1 className="text-2xl md:text-3xl font-bold text-foreground dark:text-white tracking-tight">
            DMCA &amp; Copyright Policy
          </h1>
        </div>
        <p className="text-sm text-muted-foreground dark:text-white/35 font-mono ml-[1.375rem] pl-8 mb-10 max-w-2xl leading-relaxed">
          How to submit a copyright takedown request — last updated {lastUpdated}.
        </p>

        {/* Notice about aggregation */}
        <div className="site-panel p-5 sm:p-6 mb-10 border-l-2 border-l-violet-400/40">
          <div className="flex items-start gap-3">
            <Server className="w-4 h-4 text-violet-400/70 shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground dark:text-white/60 leading-relaxed">
              AniKitty does <span className="font-semibold text-foreground/90 dark:text-white/80">not</span> host,
              upload, store, or encode any video files on its own servers. AniKitty is an
              index that links to and embeds media hosted by independent third-party
              providers. We have no control over the files stored on those external services.
              Even so, we take copyright seriously and will act on valid notices as described below.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-12">
          <Section icon={<FileText className="w-4 h-4" />} title="Filing a takedown request">
            <p>
              If you are a copyright owner (or an agent authorized to act on their behalf) and
              believe that material accessible through AniKitty infringes your copyright, you may
              submit a written notice by email. To be actionable, your notice must include all of
              the following:
            </p>
            <ul className="list-disc pl-5 space-y-2 marker:text-violet-400/60">
              <li>
                Identification of the copyrighted work you claim has been infringed (e.g. the
                specific anime title, season, and episode).
              </li>
              <li>
                The exact URL(s) on AniKitty where the material is located, so we can find it.
              </li>
              <li>
                Where possible, the name of the third-party provider or source host serving the file.
              </li>
              <li>Your full name, mailing address, and a contact email address.</li>
              <li>
                A statement that you have a good-faith belief that the use is not authorized by
                the copyright owner, its agent, or the law.
              </li>
              <li>
                A statement, under penalty of perjury, that the information in your notice is
                accurate and that you are the copyright owner or authorized to act on their behalf.
              </li>
              <li>Your physical or electronic signature.</li>
            </ul>
          </Section>

          <Section icon={<Mail className="w-4 h-4" />} title="Where to send it">
            <p>Send complete takedown notices to our designated copyright contact:</p>
            <a
              href={`mailto:${DMCA_EMAIL}?subject=DMCA%20Takedown%20Request`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600/15 border border-violet-400/25 text-sm font-medium text-violet-200 hover:bg-violet-600/25 transition-colors"
            >
              <Mail className="w-4 h-4" />
              {DMCA_EMAIL}
            </a>
            <p className="text-xs text-muted-foreground/80 dark:text-white/35">
              Please use the subject line &quot;DMCA Takedown Request&quot; and include every item
              listed above. Incomplete notices may be delayed or cannot be processed.
            </p>
          </Section>

          <Section icon={<Clock className="w-4 h-4" />} title="Processing time">
            <div className="site-panel p-5 border-l-2 border-l-amber-400/50">
              <p className="text-foreground/90 dark:text-white/75">
                Because AniKitty only links to files hosted by external third parties, resolving a
                request often depends on those upstream providers, who we do not control. As a
                result, action on a valid takedown request may take anywhere from{" "}
                <span className="font-semibold text-amber-300/90">1 to 6 months</span> to complete.
              </p>
            </div>
            <p>
              We appreciate your patience. Once a valid notice is verified, we will remove or
              disable access to the identified links on AniKitty as soon as we are reasonably able,
              and where applicable forward the request to the relevant upstream host.
            </p>
          </Section>

          <Section icon={<AlertTriangle className="w-4 h-4" />} title="Misuse & counter-notices">
            <p>
              Submitting false or bad-faith takedown notices may carry legal liability. Only the
              copyright owner or an authorized agent should file a notice. If you believe your
              content was removed in error, you may reply to the same contact address with a
              counter-notice explaining why, along with your contact details and signature.
            </p>
          </Section>
        </div>

        {/* Footer contact card */}
        <div className="mt-14 site-panel p-5 sm:p-6">
          <p className="text-sm font-semibold text-foreground/90 dark:text-white/80 mb-2">
            Questions about this policy?
          </p>
          <p className="text-sm text-muted-foreground dark:text-white/45 leading-relaxed mb-4">
            Copyright and takedown-related questions can be sent to the same address. Please do not
            use it for general support — those messages will not be answered here.
          </p>
          <a
            href={`mailto:${DMCA_EMAIL}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/50 dark:bg-white/5 border border-border dark:border-white/12 text-sm text-muted-foreground dark:text-white/70 hover:bg-accent dark:hover:bg-white/8 hover:text-foreground dark:hover:text-white transition-colors"
          >
            <Mail className="w-3.5 h-3.5 opacity-60" />
            {DMCA_EMAIL}
          </a>
        </div>
      </Container>
    </div>
  );
}
