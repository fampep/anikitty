export type DmcaSectionId =
  | "overview"
  | "what-we-host"
  | "copyright-policy"
  | "how-to-submit"
  | "counter-notification"
  | "repeat-infringer"
  | "faq"
  | "contact";

export type DmcaCalloutTone = "info" | "warning" | "caution";

export type DmcaTocItem = {
  id: DmcaSectionId;
  labelKey: string;
  number: string;
};

export type DmcaFaqItem = {
  id: string;
  question: string;
  answer: string;
  tags: string[];
};

export type DmcaHostItem = {
  id: string;
  title: string;
  description: string;
  reportable: boolean;
};

export type DmcaChecklistItem = {
  id: string;
  label: string;
  required: boolean;
};

export type DmcaStep = {
  id: string;
  title: string;
  description: string;
};

export type DmcaTimelineStep = {
  id: string;
  title: string;
  description: string;
  estimate?: string;
};
