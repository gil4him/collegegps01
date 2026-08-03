// Ported from collegeapp01 app/src/lib/entitlements.js @ 8171b8a — keep public interface.
// GPS uses this as the free/paid SEAM only (brief §6): no paywall in v1, but
// gates read these limits so precision features can lock later without rework.
// Origin kept a client twin of functions/entitlements.js; same discipline
// applies if GPS ever adds server enforcement.

export const TIER_ORDER = ["free", "premium", "elite"];

// Features whose limit is a policy STRING (not a yes/no gate) — gate() passes
// these through as allowed and the surface interprets the policy. Anything NOT
// here and not boolean/number is an unknown/misspelled feature → fail CLOSED.
const STRING_POLICIES = new Set(["scholarshipMatches", "milestoneHorizon", "modelTier"]);

export const LIMITS = {
  free: {
    students: 1,
    parentSeats: 1,
    aiMessagesPerMonth: 10,        // Ask-tab paywall: the binding free limit (enforced when enforcementEnabled).
    aiMessagesPerDay: 20,          // Cost fuse — always on (even during soft launch); monthly cap binds first once enforced.
    authenticityScansPerMonth: 1,
    scholarshipMatches: "top3",
    milestoneHorizon: "currentGrade",
    tovAccess: false,
    warRoom: false,
    financePlanner: false,         // = the Elite what-if/optimization surface (NOT the free SAI/529 estimates, which are ungated).
    docExports: false,
    modelTier: "standard",
    displayUnlimited: false,
  },
  premium: {
    students: 1,
    parentSeats: 2,
    aiMessagesPerMonth: 1000,      // high fair-use headroom; the daily cap is premium's real ceiling.
    aiMessagesPerDay: 20,          // fair-use daily ceiling (shown as "Unlimited" via displayUnlimited).
    authenticityScansPerMonth: 100,
    scholarshipMatches: "all",
    milestoneHorizon: "all4Years",
    tovAccess: false,              // Tov notebook is Elite — it wraps a human mentor relationship a $14.99 tier can't fund.
    warRoom: false,
    financePlanner: false,
    docExports: true,
    modelTier: "standard",
    displayUnlimited: true,
  },
  elite: {
    students: 4,                   // family plan
    parentSeats: 4,
    aiMessagesPerMonth: 3000,      // high fair-use headroom; the daily cap is the real ceiling.
    aiMessagesPerDay: 40,          // fair-use daily ceiling; priority model tier.
    authenticityScansPerMonth: 100,
    scholarshipMatches: "all+curated",
    milestoneHorizon: "all4Years",
    tovAccess: true,              // Tov notebook (software). The human mentor relationship is arranged outside the subscription.
    warRoom: true,               // promised (not yet built).
    financePlanner: true,        // the portfolio→aid what-if / optimization flagship (ported from legacy/).
    docExports: true,
    modelTier: "priority",
    displayUnlimited: true,
  },
};

export function tierOf(household) {
  const t = household && household.tier;
  return TIER_ORDER.indexOf(t) >= 0 ? t : "free";
}

export function cycleKey(date) {
  return date.toISOString().slice(0, 7);
}

export function gate(tier, feature, used) {
  const limits = LIMITS[tierOf({ tier })];
  const limit = limits[feature];
  if (typeof limit === "boolean") return { allowed: limit, limit, used: null, remaining: null };
  if (typeof limit === "number") {
    const u = Number(used) || 0;
    return { allowed: u < limit, limit, used: u, remaining: Math.max(0, limit - u) };
  }
  // Known policy strings pass through (the surface reads limits.X directly).
  if (STRING_POLICIES.has(feature)) return { allowed: true, limit, used: null, remaining: null };
  // Unknown / misspelled feature → fail CLOSED so a typo'd gate locks loudly in
  // testing instead of silently becoming a no-op.
  return { allowed: false, limit: limit != null ? limit : null, used: null, remaining: null };
}

export function upgradePayload(feature, tier) {
  return { code: "UPGRADE_REQUIRED", feature, tier };
}
