// Client-side presentation policy only. Firebase Auth and Firestore rules remain authoritative.
// Never infer a shared identity from an email, display name, PwnZ handle, or browser storage.
export const ACCEPTED_AGREEMENT_VERSIONS = Object.freeze([
  "v16-2026.08.27.1", // Existing production acceptance during migration
  "ecosystem-2026.11.18.1" // Proposed coordinated ecosystem release
]);
const safeName = value => typeof value === "string" ? value.trim().slice(0, 64) : "";
export function assessOwner({ uid, owner, profile, agreement, gamer, now = Date.now() } = {}) {
  const sameUid = typeof uid === "string" && uid.length > 0 && owner?.uid === uid;
  const activated = Boolean(sameUid && profile &&
    (profile.profileStatus === "active" ||
      profile.edenRealIdStatus === "activated_v16" ||
      (owner.status === "grandfathered" &&
        owner.reservationType === "legacy-profile-migration" &&
        Number(profile.memberNumber) > 0)));
  const expires = agreement?.expiresAt?.toMillis?.();
  const agreementCurrent = Boolean(activated && agreement?.accepted === true &&
    (!agreement.uid || agreement.uid === uid) &&
    ACCEPTED_AGREEMENT_VERSIONS.includes(agreement.agreementVersion) &&
    Number.isFinite(expires) && expires > now);
  const realId = activated ? safeName(owner.displayName || profile.edenRealID || profile.handle) : "";
  const handle = gamer?.uid === uid && /^[a-z][a-z0-9_]{2,23}$/.test(gamer?.handle || "")
    ? gamer.handle : "";
  return { activated, agreementCurrent, realId, handle };
}
export function visibleLightMembers(rows, uid, direction) {
  if (!["ownerUid", "memberUid"].includes(direction) || typeof uid !== "string" || !uid) return [];
  const nameKey = direction === "ownerUid" ? "memberPublicName" : "ownerPublicName";
  return (Array.isArray(rows) ? rows : [])
    .filter(row => row && row[direction] === uid && row.status === "active")
    .map(row => safeName(row[nameKey]))
    .filter(Boolean).slice(0, 100);
}
