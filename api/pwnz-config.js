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
  return res.status(200).json({ ready, configured, enabled, config: ready ? config : null });
};
