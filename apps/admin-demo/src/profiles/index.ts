import { PROFILE_IDS, type ProfileId } from "./brands";
import { ecommerce } from "./ecommerce";
import { education } from "./education";
import { print } from "./print";
import { saas } from "./saas";
import type { BusinessProfile } from "./types";
import { vpn } from "./vpn";

export const PROFILES: Record<ProfileId, BusinessProfile> = { vpn, saas, ecommerce, education, print };

export const PROFILE_LIST: BusinessProfile[] = PROFILE_IDS.map((id) => PROFILES[id]);

export { BRANDS, PROFILE_IDS, isProfileId, type Brand, type ProfileId } from "./brands";
export type * from "./types";
