// Advisory ANNEAL moderation interface. No ANNEAL model is connected here.
// Classifiers may suggest review priority, but only trusted humans or explicit,
// separately audited safety policies can authorize removals, access or publishing.
export const POST_WARNINGS=Object.freeze(["none","sensitive","sexual-context"]);
export const REPORT_REASONS=Object.freeze(["sexual","explicit","unsafe-minors","violence","harassment","privacy","copyright","spam","other"]);
export const CRITICAL_CATEGORIES=Object.freeze(["child-sexual-abuse","nonconsensual-sexual","credible-threat","private-identifiers"]);
export function normalizeWarning(value){
  if(!POST_WARNINGS.includes(value))throw Error("Choose an available content warning.");
  return value;
}
export function normalizeReportReason(value){
  if(!REPORT_REASONS.includes(value))throw Error("Choose a supported report reason.");
  return value;
}
export function shouldBlur(post){
  return Boolean(post&&["sensitive","sexual-context"].includes(post.contentWarning));
}
export function interpretAnnealSuggestion(signal){
  if(!signal||typeof signal!=="object")return Object.freeze({suggestion:"unavailable",humanReviewRequired:true,publicationAuthority:false});
  const category=typeof signal.category==="string"?signal.category:"unknown";
  const confidence=signal.confidence;
  if(!Number.isFinite(confidence)||confidence<0||confidence>1)
    return Object.freeze({suggestion:"unavailable",humanReviewRequired:true,publicationAuthority:false});
  const critical=CRITICAL_CATEGORIES.includes(category);
  if(critical)return Object.freeze({suggestion:"urgent-human-review",humanReviewRequired:true,publicationAuthority:false,canOverride:false});
  if(["sexual","nudity","graphic","violent"].includes(category))
    return Object.freeze({suggestion:confidence>=0.6?"review-sensitive":"low-confidence-review",humanReviewRequired:true,publicationAuthority:false,canOverride:false});
  return Object.freeze({suggestion:"manual-review-available",humanReviewRequired:true,publicationAuthority:false,canOverride:false});
}
