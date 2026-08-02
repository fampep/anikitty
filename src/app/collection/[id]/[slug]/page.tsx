import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/db";
import Container from "@/components/layout/container";
import { CollectionDetail } from "@/components/collections/collection-detail";
import {
  loadCollection,
  loadCollectionItems,
} from "@/lib/collections/collection-server";
import { collectionPath, formatCount } from "@/lib/collections/collection-shared";
import { APP_URL } from "@/lib/seo/site-seo";

type Params = { params: Promise<{ id: string; slug: string }> };

/**
 * Rich link previews. Private collections deliberately return a bare title so
 * a leaked id doesn't expose the description or counts to a crawler.
 */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id, slug } = await params;
  try {
    const collection = await loadCollection(getDb(), id);
    if (!collection || collection.visibility === "private") {
      return { title: "Collection | AniKitty", robots: { index: false, follow: false } };
    }

    const url = `${APP_URL}${collectionPath(collection.id, collection.slug)}`;
    const description =
      collection.description ||
      `${formatCount(collection.itemCount)} anime curated by ${collection.ownerUsername ?? "an AniKitty user"} — ${formatCount(collection.likeCount)} likes, ${formatCount(collection.followerCount)} followers.`;

    return {
      title: `${collection.title} | AniKitty`,
      description,
      alternates: { canonical: url },
      // Unlisted collections resolve by link but shouldn't be indexed.
      robots:
        collection.visibility === "public"
          ? undefined
          : { index: false, follow: false },
      openGraph: {
        title: collection.title,
        description,
        url,
        type: "website",
        siteName: "AniKitty",
      },
      twitter: {
        card: "summary_large_image",
        title: collection.title,
        description,
      },
    };
  } catch {
    return { title: "Collection | AniKitty" };
  }
}

export default async function CollectionPage({ params }: Params) {
  const { id } = await params;

  const db = getDb();
  const collection = await loadCollection(db, id);
  if (!collection) notFound();

  // Private collections are gated client-side after auth resolves — the
  // server render only ships the shell, never the contents.
  const isPrivate = collection.visibility === "private";
  const items = isPrivate ? [] : await loadCollectionItems(db, id);

  return (
    <Container className="pb-24 pt-8">
      <CollectionDetail
        initialCollection={collection}
        initialItems={items}
        gated={isPrivate}
      />
    </Container>
  );
}
