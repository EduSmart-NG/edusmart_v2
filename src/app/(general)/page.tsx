import { ComingSoon } from "@/components/general/coming-soon";
import HeroSectionSlideshow from "@/components/general/home-hero";

export default async function Home() {
  return (
    <>
      <HeroSectionSlideshow />
      <ComingSoon />
    </>
  );
}
