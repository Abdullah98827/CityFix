# CityFix

A full-stack, role-based mobile app that lets citizens report infrastructure issues directly to council staff, with real-time internal workflows, geospatial duplicate detection, and a permanent audit trail.

**Mobile Computing Module — University of Northampton, January 2026**

---

## The Problem It Solves

West Northamptonshire Council had no modern way for residents to report potholes, broken streetlights, missed bins, or flooding. Existing tools like FixMyStreet handle citizen submission but stop there. CityFix extends into a full internal operations platform, giving dispatchers, engineers, and quality auditors their own structured workflows within the same app.

---

## Numbers That Matter

- 100+ black-box test cases across 5 user roles
- 5 completely separate navigation flows and Firestore permission sets
- Haversine formula for geospatial duplicate detection (30m radius, 12hr window)
- Nearest-neighbour algorithm for engineer route optimisation
- Permanent immutable audit log that even admins cannot delete
- Tested on iOS simulator, Android simulator, and a physical iPhone

---

## Features

### 5 User Roles

| Role | What They Do |
|------|-------------|
| Citizen | Submit reports with GPS, photos, video. Track status in real-time |
| Dispatcher | Review incoming reports, merge duplicates, assign work orders to engineers |
| Engineer | View assigned jobs, navigate to locations, upload before/after evidence |
| Quality Auditor | Compare before/after media side by side, verify or reopen completed jobs |
| Admin | Manage users, view activity logs, configure categories and geographic zones |

### Duplicate Detection

Reports within 30m of each other, in the same category, submitted within 12 hours are automatically merged using the Haversine formula. Reports that are close but uncertain are flagged for manual dispatcher review with a one-tap merge button. When a master report status changes, all merged duplicates sync automatically via `statusSyncHelper.js`.

### Location Features

- GPS with draggable pin and reverse geocoding (address updates as you drag)
- Google Places autocomplete with 500ms debounce to avoid API spam
- Engineer job list sorted by real-time distance from current location
- Nearest-neighbour route optimisation button — reorders jobs from closest to furthest
- Navigate to Location button opens Google Maps directly

### Evidence Workflow

- Citizens attach 1 video (max 15MB) and up to 4 photos per report
- Engineers cannot mark a job as Resolved without uploading after-photos or video
- QA gets a side-by-side before/after media viewer with fullscreen swipe navigation
- Firebase Storage rules enforce per-user folder ownership and file type validation

### Activity Logging

Every significant action is logged with serverTimestamp, userId, role, action type, and report ID. Logs are written fire-and-forget so they never slow the app. The admin log screen is paginated with infinite scroll. Records cannot be deleted by anyone — not even admins.

### Security

- Firebase Authentication with email/password and custom role claims
- Firestore rules enforce role ownership at the document level
- Citizens read only their own reports
- Engineers update only jobs assigned to them
- Soft delete (isDeleted flag) preserves full data for auditing

---

## Tech Stack

| Area | Technology |
|------|-----------|
| Framework | React Native + Expo |
| Navigation | Expo Router (file-based) |
| Backend | Firebase (Firestore, Auth, Storage, Cloud Functions) |
| Maps | react-native-maps + Expo Location |
| Location Search | Google Places API |
| Media | Expo ImagePicker + Expo Video |
| Notifications | Expo Notifications (in-app + push infrastructure) |
| Icons | @expo/vector-icons (Ionicons) |

---

## Architecture

```
app/
  (auth)/           Login, Register
  (citizen)/        Home, Report creation, My Reports, Map view
  (dispatcher)/     Inbox, Report detail, Work order creation
  (engineer)/       Jobs list, Job detail, Resolution screen
  (qa)/             Verification queue, Verify screen
  (admin)/          Users, Reports, Categories, Zones, Logs

components/         AppHeader, ReportCard, JobCard, MediaGallery, MergedReportsSection
utils/
  logger.js         Central activity logging
  statusSyncHelper.js  Syncs master report status to all merged duplicates
  duplicateDetection.js  Haversine auto-merge + manual grouping logic
```

---

## Data Model

```
Firestore
  UserMD/{uid}        name, email, role, photoURL, isDisabled, expoPushToken
  reports/{id}        full lifecycle fields including isDuplicateOf, duplicateCount,
                      mergedReportIds, afterPhotos, reopenReason, isDeleted
  ConfigMD/
    categories        admin-managed, no redeploy needed
    reopenReasons     QA structured feedback options
  logs/{id}           permanent audit trail, admin read-only
```

---

## Report Lifecycle

```
Citizen submits report
        |
Dispatcher reviews, merges duplicates, creates work order
        |
Engineer assigned, starts job, uploads after evidence, marks Resolved
        |
QA verifies side-by-side comparison
        |
Verified  OR  Reopened with structured reason
        |
Citizen notified, status tracker updated in real-time
```

---

## Testing Summary

100+ test cases documented across all roles. Run on iOS simulator, Android simulator, and a physical iPhone.

Bugs found and fixed during testing:
- Profile picture URI handling inconsistency across devices
- Draft media not loading correctly on edit
- Haversine distance threshold miscalculation in merge assistant
- Notification badge not updating reliably on all screens
- QA fullscreen viewer missing swipe navigation
- Zone drawing allowed fewer than 3 points

---

## Getting Started

### Prerequisites

- Node.js 18+
- Expo CLI
- Firebase project with Firestore, Auth, and Storage enabled
- Google Places API key

### Install

```bash
git clone https://github.com/Abdullah98827/CityFix
cd CityFix
npm install
```

### Environment

```env
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=
```

### Run

```bash
npx expo start
```

### Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | abdullah@gmail.com | CityFix@1 |
| Citizen | emmanuel@gmail.com | CityFix@1 |
| Dispatcher | dispatcher@gmail.com | CityFix@1 |
| Engineer | engineer@gmail.com | CityFix@1 |
| QA | qa@gmail.com | CityFix@1 |

---

## Planned Improvements

- Server-side push notifications via Expo Push API
- Video compression for longer clips
- Full offline mode with queued submission on reconnect
- Text similarity / AI-powered duplicate detection
- Automated tests (Jest + Detox)

---

## Author

Abdullah Abdullah
BSc (Hons) Web Development & Cyber Security — University of Northampton (2023–2026)
https://www.linkedin.com/in/abdullah-a-362a3b212/
GitHub: https://github.com/Abdullah98827
