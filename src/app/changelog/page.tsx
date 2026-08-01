import ChangelogContent from "@/components/changelog/changelog-content";
import { getChangelogEntries } from "@/lib/changelog/changelog-server";
import { buildPageMetadata, PAGE_SEO } from "@/lib/seo/site-seo";

export const metadata = buildPageMetadata(PAGE_SEO.changelog);

export default async function ChangelogPage() {
  let entries: Awaited<ReturnType<typeof getChangelogEntries>> = [];
  try {
    entries = await getChangelogEntries();
  } catch {
    /* migration may not have run yet */
  }
  return <ChangelogContent initialEntries={entries} />;
}
