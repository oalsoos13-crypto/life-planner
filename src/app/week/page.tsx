import { redirect } from "next/navigation";
import { getContext } from "@/lib/week";

export default async function WeekIndex() {
  const { currentWeek } = await getContext();
  redirect(`/week/${currentWeek}`);
}
