# Cardistry Dex (Web)

A modern, single-page "Pokedex" for cardistry movements using Firebase (Auth, Firestore, Storage).

This repo includes:
- index.html — main UI
- styles.css — styling and modern visuals
- src/firebase-config.js — replace with your Firebase config
- src/app.js — app logic (Auth, Firestore, Storage using Firebase v9 modular SDK)

Features:
- Realtime feed of all movements (Firestore onSnapshot)
- Search bar (search by name, creator, year, tags)
- Filters: year and difficulty
- Add Movement modal with image upload (Storage) and metadata saved to Firestore
- Google Sign-In and Sign-Out (optional, but recommended)
- Responsive and modern visual design

Setup
1. Create a Firebase project: https://console.firebase.google.com/
2. Enable:
   - Authentication -> Sign-in method -> Google
   - Firestore (start in test mode while developing)
   - Storage (start in test mode while developing)
3. Copy your Firebase config object and paste into `src/firebase-config.js`.
   - Never expose production keys in a public repository without proper rules.
4. Serve static files:
   - Simple: open `index.html` in the browser (works with Firebase client SDK).
   - Better: use a static host (Firebase Hosting, Netlify, Vercel).

Firestore structure (used by the app)
- Collection: `movements`
  - Fields: name, creator, year, difficulty, description, video, tags (array), imageUrl (string), createdBy (object), createdAt (timestamp)

Security & Production Notes
- Update Firestore and Storage security rules before going public.
- For production, write rules so only authenticated users can create content (or customize as needed).
- Consider user moderation for submitted movements.
- Limit file size and allowed mime types in Storage rules if necessary.

Customization
- Edit styles in `styles.css` for different colors or layout.
- Extend movement fields (e.g., difficulty rating, examples, variations).
- Add editing and deleting (requires secure Firestore rules and optional server-side checks).

If you'd like, I can:
- Add edit/delete operations with permission checks;
- Provide a Firebase Security Rules example for a protected production setup;
- Create a deployment guide for Firebase Hosting.

Enjoy — and tell me any specific UI or data fields you'd like added.
