// Public Firebase web configuration only. Never expose Admin SDK credentials here.
// PwnZ should use the same Firebase project as Light of Hope only after
// its Firestore rules and PwnZ domain authorization are reviewed.
module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store, max-age=0");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "method_not_allowed" });
  }
  const config = {
    apiKey: process.env.PWNZ_FIREBASE_API_KEY || "",
    authDomain: process.env.PWNZ_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.PWNZ_FIREBASE_PROJECT_ID || "",
    appId: process.env.PWNZ_FIREBASE_APP_ID || "",
    storageBucket: process.env.PWNZ_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.PWNZ_FIREBASE_MESSAGING_SENDER_ID || ""
  };
  const configured = ["apiKey", "authDomain", "projectId", "appId"].every(key => Boolean(config[key]));
  // Fail closed until cross-network rules, authorized domains, and moderator controls are verified.
  const enabled = process.env.PWNZ_SOCIAL_BACKEND_ENABLED === 'true';
  const ready = configured && enabled;
  // Gamertag activation is an independent feature, not a social/posting release.
  // Keep this off until the Eden-only registration rules pass emulator tests.
  const sharedProjectVerified = configured &&
    Boolean(process.env.PWNZ_SHARED_FIREBASE_PROJECT_ID) &&
    config.projectId === process.env.PWNZ_SHARED_FIREBASE_PROJECT_ID;
  const gamertagRegistrationReady = sharedProjectVerified &&
    process.env.PWNZ_GAMERTAG_REGISTRATION_ENABLED === 'true';
  // New PwnZ members must complete shared Eden reservation before Gamertag.
  // Existing Eden members do not need to create any new ecosystem account.
  const edenRegistrarReady = sharedProjectVerified &&
    process.env.PWNZ_ECOSYSTEM_IDENTITY_ENABLED === 'true';
  // The other two release switches never authorize new account creation alone.
  // Only turn on this final gate after the Light of Hope trusted paired
  // transaction is deployed and independently enabled there.
  const pairedRegistrationReady = edenRegistrarReady && gamertagRegistrationReady &&
    process.env.PWNZ_PAIRED_REGISTRATION_ENABLED === 'true';
  // Reviewed creator applications are distinct from public posting.
  // The application proxy still verifies Firebase bearer tokens and its
  // trusted Light of Hope backend verifies Eden ownership + agreement.
  const applicationsReady = sharedProjectVerified &&
    process.env.PWNZ_APPLICATIONS_ENABLED === 'true';
  return res.status(200).json({
    ready, configured, enabled, sharedProjectVerified, gamertagRegistrationReady, edenRegistrarReady, pairedRegistrationReady, applicationsReady,
    config: configured ? config : null
  });
};
