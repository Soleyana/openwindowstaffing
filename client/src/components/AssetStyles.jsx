import { ASSETS } from "../config";

/**
 * Injects CSS custom properties for config-driven assets.
 * Use in CSS: background-image: var(--asset-healthcare-hero, url("/images/healthcare-hero.jpg"));
 */
export default function AssetStyles() {
  return (
    <style dangerouslySetInnerHTML={{
      __html: `
        :root {
          --asset-healthcare-hero: url("${ASSETS.healthcareHero}");
          --asset-hero-bg: url("${ASSETS.heroBg}");
          --asset-healthcare-pro-banner: url("${ASSETS.healthcareProBanner}");
          --asset-team-photo: url("${ASSETS.teamPhoto}");
        }
      `,
    }} />
  );
}
