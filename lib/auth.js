const { createClient } = require("@supabase/supabase-js");

async function requireUser(req, res) {

  const authHeader =
    req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Missing authorization token"
    });

    return null;
  }

  const token =
    authHeader.substring(7);

  if (!token) {
    res.status(401).json({
      error: "Missing authorization token"
    });

    return null;
  }

  const supabaseAuth = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const {
    data,
    error
  } = await supabaseAuth.auth.getUser(token);

  if (error || !data || !data.user) {
    res.status(401).json({
      error: "Invalid or expired session"
    });

    return null;
  }

  return data.user;
}

module.exports = {
  requireUser
};
