// PwnZ Arena: secure placeholder. Do not enable gameplay from client-side state.
// Phase 2 must replace this with server-side user session verification,
// a trusted billing-provider subscription lookup, and entitlement policies.
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  return res.status(200).json({
    authenticated: false,
    subscription: { status: 'unavailable' },
    permissions: {
      browse: true,
      watch: true,
      viewPosts: true,
      play: false,
      enterTournaments: false,
      claimPrizes: false
    },
    message: 'Arena subscriptions are not available during the foundation preview.'
  });
};
