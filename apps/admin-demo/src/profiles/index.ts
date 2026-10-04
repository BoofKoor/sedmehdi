import { PROFILE_IDS, type ProfileId } from "./brands";
import { ecommerce } from "./ecommerce";
import { education } from "./education";
import { hosting } from "./hosting";
import { print } from "./print";
import { saas } from "./saas";
import type { BusinessProfile } from "./types";

export const PROFILES: Record<ProfileId, BusinessProfile> = { hosting, saas, ecommerce, education, print };

export const PROFILE_LIST: BusinessProfile[] = PROFILE_IDS.map((id) => PROFILES[id]);

export { BRANDS, LEGACY_PROFILES, PROFILE_IDS, isProfileId, resolveProfileId, type Brand, type ProfileId } from "./brands";
export type * from "./types";
