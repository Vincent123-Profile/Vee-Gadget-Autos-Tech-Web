# Firebase and Netlify security setup

This guide is for the `redesign/premium-storefront` branch. Do not merge or publish the security changes until these steps are complete and tested.

## 1. Create a Firebase Admin service account key

1. Open Firebase Console and select project `veepay-4521d`.
2. Open Project settings, then Service accounts.
3. Generate a new private key and download the JSON file.
4. Keep the file private. Do not upload it to GitHub, the website, or chat.

## 2. Add Netlify environment variables

In Netlify, open the site settings, then Environment variables. Add:

- `FIREBASE_SERVICE_ACCOUNT`: the complete contents of the downloaded service-account JSON file.
- `FIREBASE_DATABASE_URL`: `https://veepay-4521d-default-rtdb.firebaseio.com`
- `ADMIN_EMAIL`: the exact email address used by the website administrator's Firebase Authentication account.

Set the variables for the deploy contexts used by the site. Trigger a new deploy after saving them.

## 3. Enable anonymous customer authentication

1. Open Firebase Console, Authentication, Sign-in method.
2. Enable Anonymous.
3. Keep Email/Password enabled for the administrator account.
4. Sign in to the administrator account and complete email verification.

Customer checkout uses Firebase anonymous authentication to obtain a short-lived identity token. The server function verifies the token before processing an order.

## 4. Publish the Firebase rules

After the Netlify functions have deployed successfully, publish the rules from:

- `firebase-database-rules.json` in Realtime Database, Rules.
- `firebase-storage-rules.txt` in Storage, Rules.

The new rules require the Firebase custom claim `admin: true` for administrative writes and private order access. The `bootstrap-admin` function assigns this claim only to the verified account whose email matches `ADMIN_EMAIL`.

Do not publish these rules before the functions and environment variables are ready. Existing administrator sessions must sign out and sign in again after the claim is assigned.

## 5. Test before production release

- Sign in with the approved, verified administrator email.
- Confirm the admin dashboard opens and product edits save.
- Confirm product, automobile, VeeXchange and VeeMedia uploads work.
- Submit a test checkout with a low-value test product.
- Confirm the server calculates the price from Firebase product records.
- Confirm stock decreases once, and the order appears in the admin dashboard.
- Try a checkout with insufficient stock. The order must be rejected and stock must stay unchanged.
- Sign out. Confirm an ordinary visitor cannot read orders or write to inventory.
- Confirm the live production site is unchanged until the pull request is merged.

## Important

The current checkout does not include a customer receipt-upload form. Receipt storage is therefore restricted to administrators until an order-linked customer receipt workflow is built.

Never commit the service-account JSON, private keys, passwords, or tokens to this repository.
