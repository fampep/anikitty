import { DMCA_EMAIL } from "@/constants/site-meta";
import type {
  DmcaChecklistItem,
  DmcaFaqItem,
  DmcaHostItem,
  DmcaStep,
  DmcaTimelineStep,
  DmcaTocItem,
} from "@/lib/dmca/types";

/** Sticky TOC — label keys resolve via i18n chrome strings. */
export const DMCA_TOC: DmcaTocItem[] = [
  { id: "overview", labelKey: "dmca.toc.overview", number: "01" },
  { id: "what-we-host", labelKey: "dmca.toc.whatWeHost", number: "02" },
  { id: "copyright-policy", labelKey: "dmca.toc.copyrightPolicy", number: "03" },
  { id: "how-to-submit", labelKey: "dmca.toc.howToSubmit", number: "04" },
  { id: "counter-notification", labelKey: "dmca.toc.counterNotification", number: "05" },
  { id: "repeat-infringer", labelKey: "dmca.toc.repeatInfringer", number: "06" },
  { id: "faq", labelKey: "dmca.toc.faq", number: "07" },
  { id: "contact", labelKey: "dmca.toc.contact", number: "08" },
];

export const DMCA_HOST_ITEMS: DmcaHostItem[] = [
  {
    id: "metadata",
    title: "Catalog metadata",
    description:
      "Titles, synopses, episode lists, scores, and related catalog fields drawn from public anime databases (such as AniList / MyAnimeList references).",
    reportable: false,
  },
  {
    id: "artwork",
    title: "Posters & artwork",
    description:
      "Cover images, banners, and similar artwork displayed for browsing and identification — typically sourced from catalog providers, not uploaded by AniKitty as original video.",
    reportable: true,
  },
  {
    id: "ugc",
    title: "User-generated content",
    description:
      "Signed-in users may post episode comments, forum threads, live chat messages, reviews, and profile text or images. Moderators may remove abusive or infringing UGC when reported.",
    reportable: true,
  },
  {
    id: "links",
    title: "Third-party links & embeds",
    description:
      "AniKitty indexes and may embed or link to streams hosted by independent third-party providers. AniKitty does not host, upload, store, or encode video files on its own servers, and does not control files stored on those external services.",
    reportable: true,
  },
];

export const DMCA_CHECKLIST: DmcaChecklistItem[] = [
  {
    id: "work",
    label:
      "Identification of the copyrighted work you claim has been infringed (e.g. the specific anime title, season, and episode).",
    required: true,
  },
  {
    id: "urls",
    label: "The exact URL(s) on AniKitty where the material is located, so we can find it.",
    required: true,
  },
  {
    id: "provider",
    label:
      "Where possible, the name of the third-party provider or source host serving the file.",
    required: false,
  },
  {
    id: "contact",
    label: "Your full name, mailing address, and a contact email address.",
    required: true,
  },
  {
    id: "good-faith",
    label:
      "A statement that you have a good-faith belief that the use is not authorized by the copyright owner, its agent, or the law.",
    required: true,
  },
  {
    id: "accuracy",
    label:
      "A statement, under penalty of perjury, that the information in your notice is accurate and that you are the copyright owner or authorized to act on their behalf.",
    required: true,
  },
  {
    id: "signature",
    label: "Your physical or electronic signature.",
    required: true,
  },
];

export const DMCA_SUBMIT_STEPS: DmcaStep[] = [
  {
    id: "prepare",
    title: "Prepare your claim",
    description:
      "Confirm you are the copyright owner or an authorized agent. Gather the work identification, AniKitty URLs, and your contact details from the checklist below.",
  },
  {
    id: "complete",
    title: "Complete every required element",
    description:
      "Include all required statements and your signature. Incomplete notices may be delayed or cannot be processed.",
  },
  {
    id: "send",
    title: "Email the designated contact",
    description: `Send the full written notice to ${DMCA_EMAIL} with the subject line “DMCA Takedown Request”.`,
  },
  {
    id: "wait",
    title: "Allow time for review",
    description:
      "Valid notices are reviewed and verified. Because streams sit on upstream hosts we do not control, action may take longer than a typical site-only takedown.",
  },
];

/** Processing pipeline — estimate range comes from the prior DMCA page. */
export const DMCA_PROCESS_TIMELINE: DmcaTimelineStep[] = [
  {
    id: "submitted",
    title: "Submitted",
    description: "Your complete notice arrives at the designated copyright mailbox.",
  },
  {
    id: "review",
    title: "Review",
    description: "We check that required elements are present and the URLs are identifiable on AniKitty.",
  },
  {
    id: "verification",
    title: "Verification",
    description:
      "We verify the claim appears valid on its face. False or bad-faith notices may carry legal liability.",
  },
  {
    id: "action",
    title: "Action",
    description:
      "Once verified, we remove or disable access to the identified links on AniKitty as soon as we are reasonably able, and where applicable forward the request to the relevant upstream host.",
    estimate: "Often 1–6 months overall",
  },
  {
    id: "confirmation",
    title: "Confirmation",
    description:
      "When we can, we confirm the outcome for the URLs you listed. Upstream providers remain outside our control.",
  },
];

export const DMCA_COUNTER_TIMELINE: DmcaTimelineStep[] = [
  {
    id: "reply",
    title: "Reply with a counter-notice",
    description:
      "If you believe content was removed in error, reply to the same copyright contact with an explanation, your contact details, and your signature.",
  },
  {
    id: "review-counter",
    title: "We review the counter-notice",
    description:
      "We review whether the counter-notice addresses the removal and includes the information needed to evaluate it.",
  },
  {
    id: "outcome",
    title: "Outcome",
    description:
      "Depending on the circumstances, access may remain disabled, be restored, or require further clarification. Misuse of either notices or counter-notices can carry legal consequences.",
  },
];

export const DMCA_FAQ_ITEMS: DmcaFaqItem[] = [
  {
    id: "does-anikitty-host-video",
    question: "Does AniKitty host video files?",
    answer:
      "No. AniKitty does not host, upload, store, or encode video files on its own servers. It is an index that links to and embeds media hosted by independent third-party providers. We have no control over the files stored on those external services.",
    tags: ["hosting", "video", "streams", "third-party"],
  },
  {
    id: "what-can-i-report",
    question: "What can I report under this policy?",
    answer:
      "You may report material accessible through AniKitty that you believe infringes your copyright — including specific AniKitty page URLs that link to or embed allegedly infringing streams, as well as user-generated content (comments, forum posts, chat, profile materials) and, where applicable, artwork displayed on the site. Catalog metadata alone (titles, synopses, scores) is generally not a substitute for identifying specific infringing material URLs.",
    tags: ["report", "ugc", "links", "artwork"],
  },
  {
    id: "who-can-file",
    question: "Who may file a DMCA / copyright notice?",
    answer:
      "Only the copyright owner or an agent authorized to act on their behalf should file a notice. Submitting false or bad-faith takedown notices may carry legal liability.",
    tags: ["owner", "agent", "liability"],
  },
  {
    id: "how-long",
    question: "How long does processing take?",
    answer:
      "Because AniKitty only links to files hosted by external third parties, resolving a request often depends on those upstream providers, who we do not control. As a result, action on a valid takedown request may take anywhere from 1 to 6 months to complete. We appreciate your patience.",
    tags: ["timeline", "processing", "months"],
  },
  {
    id: "incomplete-notice",
    question: "What if my notice is incomplete?",
    answer:
      "Please use the subject line “DMCA Takedown Request” and include every required item on the checklist. Incomplete notices may be delayed or cannot be processed.",
    tags: ["incomplete", "checklist", "subject"],
  },
  {
    id: "counter-notice",
    question: "What if my content was removed by mistake?",
    answer:
      "If you believe your content was removed in error, you may reply to the same copyright contact address with a counter-notice explaining why, along with your contact details and signature.",
    tags: ["counter", "restore", "error"],
  },
  {
    id: "general-support",
    question: "Can I use this email for general support?",
    answer:
      "No. Copyright and takedown-related questions can be sent to the designated copyright address. Please do not use it for general support — those messages will not be answered here.",
    tags: ["support", "contact", "email"],
  },
];

/** Plain-text notice template for copy / download. */
export function buildDmcaNoticeTemplate(email = DMCA_EMAIL): string {
  return `Subject: DMCA Takedown Request

To: ${email}

I am writing to report copyright infringement under the Digital Millennium Copyright Act (or applicable copyright law).

1. Copyrighted work
[Identify the copyrighted work — e.g. anime title, season, episode]

2. Location on AniKitty
[Exact AniKitty URL(s) where the material appears]

3. Upstream source (if known)
[Third-party provider or host name, if available]

4. Contact information
Name: [Full legal name]
Mailing address: [Street, city, postal code, country]
Email: [Contact email]

5. Good-faith statement
I have a good-faith belief that the use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.

6. Accuracy / authority statement
Under penalty of perjury, I state that the information in this notice is accurate and that I am the copyright owner or authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.

7. Signature
[Physical or electronic signature]
[Date]
`;
}

/** Flattened searchable text per section for instant search. */
export function getDmcaSearchBlob(): { id: string; text: string }[] {
  const host = DMCA_HOST_ITEMS.map((h) => `${h.title} ${h.description}`).join("\n");
  const checklist = DMCA_CHECKLIST.map((c) => c.label).join("\n");
  const steps = DMCA_SUBMIT_STEPS.map((s) => `${s.title} ${s.description}`).join("\n");
  const process = DMCA_PROCESS_TIMELINE.map((s) => `${s.title} ${s.description} ${s.estimate ?? ""}`).join(
    "\n",
  );
  const counter = DMCA_COUNTER_TIMELINE.map((s) => `${s.title} ${s.description}`).join("\n");
  const faq = DMCA_FAQ_ITEMS.map((f) => `${f.question} ${f.answer} ${f.tags.join(" ")}`).join("\n");

  return [
    {
      id: "overview",
      text: `overview AniKitty does not host upload store encode any video files on its own servers index that links to and embeds media hosted by independent third-party providers no control over the files stored on those external services take copyright seriously valid notices designated contact ${DMCA_EMAIL}`,
    },
    {
      id: "what-we-host",
      text: `what we host catalog metadata titles synopses posters artwork banners user-generated content comments forum chat reviews profile third-party links embeds streams reportable ${host}`,
    },
    {
      id: "copyright-policy",
      text: `copyright policy takedown written notice email owner authorized agent good-faith belief penalty of perjury false bad-faith liability actionable ${checklist}`,
    },
    {
      id: "how-to-submit",
      text: `how to submit steps checklist template email subject DMCA Takedown Request incomplete delayed processing timeline submitted review verification action confirmation 1 to 6 months upstream ${steps} ${checklist} ${process}`,
    },
    {
      id: "counter-notification",
      text: `counter-notification counter-notice removed in error reply same contact explanation contact details signature restore ${counter}`,
    },
    {
      id: "repeat-infringer",
      text: `repeat infringer policy suspend terminate accounts repeatedly post infringing user-generated content comments forum chat profile appropriate circumstances does not host third-party video`,
    },
    {
      id: "faq",
      text: `faq questions answers ${faq}`,
    },
    {
      id: "contact",
      text: `contact copyright email designated ${DMCA_EMAIL} not general support messages will not be answered here DMCA Takedown Request`,
    },
  ];
}
