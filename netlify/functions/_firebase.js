const admin = require("firebase-admin");

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured.");

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(raw);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT must contain valid JSON.");
  }

  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!databaseURL) throw new Error("FIREBASE_DATABASE_URL is not configured.");

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL
  });
}

function response(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    },
    body: JSON.stringify(payload)
  };
}

function readBearer(event) {
  const header = event.headers?.authorization || event.headers?.Authorization || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : "";
}

async function verifyUser(event) {
  const token = readBearer(event);
  if (!token) {
    const error = new Error("Sign-in is required.");
    error.statusCode = 401;
    throw error;
  }
  const app = getAdminApp();
  return app.auth().verifyIdToken(token);
}

module.exports = { getAdminApp, response, verifyUser };
