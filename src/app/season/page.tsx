import { redirect } from "next/navigation";
import { getAniListSeason } from "@/lib/home/season";
import { ROUTES } from "@/constants/routes";

export default function SeasonIndexPage() {
  const { season, year } = getAniListSeason();
  redirect(ROUTES.season(season, year));
}
