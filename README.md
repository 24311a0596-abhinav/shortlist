# Shortlist (React + TypeScript + Firebase)
1. Firebase: new project -> Add Web app -> copy config. Enable Authentication > Email/Password. Create Firestore, publish `firestore.rules`.
2. `cp .env.example .env`, fill the four VITE_FB_* values.
3. `npm install && npm run dev`
4. Vercel: add the same variables, deploy, then add the domain under Authentication > Settings > Authorized domains.
Testing: `?bug=1` disables conflict detection and skews the offer rate. Hooks: lane-<Stage>, stat-total/upcoming/offers/rate.
