export type {
  FaqCategoryDto,
  FaqCategoryId,
  FaqCategoryMeta,
  FaqItem,
  FaqPayload,
} from "@/lib/faq/types";
export {
  categoriesWithContent,
  getFaqItem,
  getPopularFaqItems,
  getRelatedFaqItems,
} from "@/lib/faq/faq-helpers";
export { resolveFaqIcon, toFaqCategoryMeta } from "@/lib/faq/faq-icons";
export {
  getFaqFeedback,
  setFaqFeedback,
  type FaqFeedbackEntry,
  type FaqFeedbackVote,
} from "@/lib/faq/faq-feedback";
