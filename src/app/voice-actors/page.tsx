import { redirect } from "next/navigation";
import { ROUTES } from "@/constants/routes";

/** Legacy actor search — merged into unified `/search`. */
export default function VoiceActorsPage() {
  redirect(ROUTES.SEARCH);
}
