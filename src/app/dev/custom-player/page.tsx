import { redirect } from "next/navigation";

/** @deprecated Use `/dev/kittyplayer` */
export default function LegacyCustomPlayerDevRedirect() {
  redirect("/dev/kittyplayer");
}
