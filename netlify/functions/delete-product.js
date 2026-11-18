const { getAdminApp, response, verifyUser } = require("./_firebase");

const STORAGE_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || "veepay-4521d.appspot.com";

function collectStoragePaths(product) {
  const urls = [
    ...(Array.isArray(product.images) ? product.images : []),
    product.image,
    product.video
  ].filter(value => typeof value === "string" && value.trim());

  const paths = new Set();
  for (const value of urls) {
    try {
      if (value.startsWith("gs://")) {
        const match = value.match(/^gs:\/\/([^/]+)\/(.+)$/);
        if (match && match[1] === STORAGE_BUCKET) paths.add(match[2]);
        continue;
      }

      const url = new URL(value);
      if (url.hostname !== "firebasestorage.googleapis.com") continue;
      const bucketMatch = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      if (!bucketMatch || bucketMatch[1] !== STORAGE_BUCKET) continue;
      paths.add(decodeURIComponent(bucketMatch[2]));
    } catch {
      // Ignore external URLs and malformed values. They are not Firebase Storage objects.
    }
  }
  return [...paths];
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { error: "Method not allowed." });
  }

  try {
    const decoded = await verifyUser(event);
    if (decoded.admin !== true) {
      return response(403, { error: "Administrator access is required." });
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch {
      return response(400, { error: "Invalid JSON body." });
    }

    const productId = String(body.productId || "");
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(productId)) {
      return response(400, { error: "A valid product ID is required." });
    }

    const app = getAdminApp();
    const productRef = app.database().ref(`products/${productId}`);
    const snapshot = await productRef.once("value");
    if (!snapshot.exists()) {
      return response(404, { error: "Product was not found." });
    }

    const product = snapshot.val() || {};
    await productRef.remove();

    const paths = collectStoragePaths(product);
    const bucket = app.storage().bucket(STORAGE_BUCKET);
    const results = await Promise.allSettled(
      paths.map(path => bucket.file(path).delete({ ignoreNotFound: true }))
    );
    const failed = results.filter(result => result.status === "rejected").length;

    return response(200, {
      success: true,
      deleted: true,
      storageObjectsRemoved: results.length - failed,
      storageCleanupFailed: failed
    });
  } catch (error) {
    const status = error.statusCode || 500;
    return response(status, {
      error: status === 500 ? "Unable to delete the product right now." : error.message
    });
  }
};
