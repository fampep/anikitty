import WatchHistoryContent from "@/components/history/watch-history-content";
import { buildPageMetadata, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata = buildPageMetadata(PAGE_SEO.history);

export default function HistoryPage() {
  return <WatchHistoryContent />;
}
