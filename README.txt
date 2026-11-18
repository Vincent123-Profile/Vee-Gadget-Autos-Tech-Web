========================================================================
VEE GADGET AUTOS TECH (BN 9677014)
COMPLETE MASTER PLATFORM OPERATIONAL MANUAL & DEPLOYMENT GUIDE
========================================================================

1. ARCHITECTURE OVERVIEW
------------------------
This platform is built using standard frontend tools (HTML5, Tailwind CSS, Vanilla JS) paired with Firebase backend infrastructure (Firebase Realtime Database, Firebase Authentication, Firebase Storage) and Netlify hosting.

- index.html: Single-page application containing all public views, shop catalogue, Vee Find My Device wizard, VeeXchange rates board, and Admin Control Panel.
- firebase-database-rules.json: Security rules enforcing public catalogue reads, restricted admin-only database writes, and path indexing.
- firebase-storage-rules.txt: Storage bucket security isolating public media from private customer bank receipts.
- netlify.toml: SPA route rewriting, caching policies, and security headers.

2. FIREBASE REALTIME DATABASE INITIALIZATION
---------------------------------------------
1. Go to https://console.firebase.google.com/ and open your project (veepay-4521d).
2. Under "Build", select "Realtime Database" and click "Create Database".
3. Under the "Rules" tab, paste the exact contents of `firebase-database-rules.json` and click "Publish".
4. Go to "Authentication" -> "Sign-in method" and enable "Email/Password".
5. Create an Administrator account (e.g. veegadgethub001@gmail.com).

3. FIREBASE STORAGE SETUP
--------------------------
1. Under "Build", click "Storage" -> "Get Started".
2. Under the "Rules" tab, paste the contents of `firebase-storage-rules.txt` and click "Publish".

4. NETLIFY & GITHUB DEPLOYMENT
-------------------------------
1. Push this directory to your GitHub repository:
   git init
   git add .
   git commit -m "Initial production release"
   git push origin main

2. Log into Netlify (https://app.netlify.com/), click "Add new site" -> "Import an existing project" -> select GitHub.
3. Select your repository. Netlify will detect `netlify.toml` automatically.
4. Click "Deploy Site".

5. ADMINISTRATOR DASHBOARD ACCESS
----------------------------------
To access the Admin Panel on your live website:
Method 1: Click the "VG" header logo 3 times consecutively.
Method 2: Append `#admin` to your website URL (e.g., https://your-site.netlify.app/#admin).
Method 3: Press Ctrl + Shift + A on any keyboard.

Sign in using your Firebase Authentication Admin email and password.

6. MANAGING GADGETS & REAL-WORLD REPAIRS
----------------------------------------
In the Admin Dashboard under "Products Manager":
- Click "+ Add New Gadget".
- Fill in real-world diagnostic details: Face ID status, True Tone status, original battery/screen indicators, battery health percentage, and MDM enrolment status (Clean, Enrolled, Removed, Bypassed).
- Click "Save Product". The database syncs in real time across all customer devices.