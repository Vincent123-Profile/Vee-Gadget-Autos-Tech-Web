const { getAdminApp, response, verifyUser } = require("./_firebase");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return response(405, { error: "Method not allowed." });

  try {
    const decoded = await verifyUser(event);
    const allowedEmail = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
    const signedInEmail = String(decoded.email || "").trim().toLowerCase();
    const emailVerified = decoded.email_verified === true;

    if (!allowedEmail) return response(503, { error: "ADMIN_EMAIL is not configured." });
    if (!signedInEmail || signedInEmail !== allowedEmail || !emailVerified) {
      return response(403, {
        error: "Administrator verification failed.",
        diagnostic: {
          signedInEmail: signedInEmail || "(missing from Firebase token)",
          emailVerified,
          adminEmailMatches: Boolean(signedInEmail && signedInEmail === allowedEmail)
        }
      });
    }

    const auth = getAdminApp().auth();
    const user = await auth.getUser(decoded.uid);
    await auth.setCustomUserClaims(decoded.uid, {
      ...(user.customClaims || {}),
      admin: true
    });

    return response(200, { success: true, message: "Administrator access enabled. Refresh your sign-in token." });
  } catch (error) {
    const status = error.statusCode || 401;
    return response(status, { error: status >= 500 ? "Administrator setup failed." : error.message });
  }
};
