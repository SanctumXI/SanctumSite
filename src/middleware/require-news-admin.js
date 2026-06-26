// Gate for news management. Role membership is resolved at login (via the
// guilds.members.read scope) and cached on the server-side session as
// `user.canManageNews`. A role change in Discord takes effect on next login.
//
// Session-only by design: the launcher JWT path never carries this flag, so
// only browser sessions of users holding the configured role pass.
export function requireNewsAdmin(req, res, next) {
  const user = req.session?.user;
  if (!user) {
    res.status(401).json({ error: 'Sign in required' });
    return;
  }

  if (!user.canManageNews) {
    res.status(403).json({ error: 'You do not have permission to manage news' });
    return;
  }

  req.auth = { discordId: user.id, user, source: 'session' };
  next();
}
