import { getDb } from "@/db";
import { loadCollection } from "@/lib/collections/collection-server";
import { createOgImageResponse, OG_CONTENT_TYPE, OG_SIZE } from "@/lib/seo/og-card-image";
import { formatCount } from "@/lib/collections/collection-shared";

export const alt = "Collection | AniKitty";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * Share-card image. Runs on the node runtime (not edge) because it reads the
 * collection from Postgres before rendering.
 */
export default async function Image({ params }: { params: { id: string } }) {
  try {
    const collection = await loadCollection(getDb(), params.id);
    if (!collection || collection.visibility === "private") {
      return createOgImageResponse({
        badge: "Collection",
        title: "AniKitty Collection",
        subtitle: "Curated anime lists on AniKitty.",
        accent: "violet",
      });
    }

    return createOgImageResponse({
      badge: collection.isFeatured ? collection.featuredLabel || "Featured" : "Collection",
      title: collection.title,
      subtitle:
        collection.description?.slice(0, 140) ||
        `Curated by ${collection.ownerUsername ?? "an AniKitty user"}`,
      accent: "violet",
      features: [
        `${formatCount(collection.itemCount)} anime`,
        `${formatCount(collection.likeCount)} likes`,
        `${formatCount(collection.followerCount)} followers`,
      ],
    });
  } catch {
    return createOgImageResponse({
      badge: "Collection",
      title: "AniKitty Collection",
      subtitle: "Curated anime lists on AniKitty.",
      accent: "violet",
    });
  }
}
