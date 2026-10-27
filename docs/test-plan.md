# Test Plan and Results

Environment: local (React on 5173, Express on 5000, MongoDB Atlas). All data is fictional.
Preconditions for all tests: server and client running, database seeded (`npm run seed`), `AUTH_RATE_LIMIT=200` and `AI_RATE_LIMIT=200` set locally.
Requirement key: R1 auth, R2 browse doctors, R3 bookings, R4 dashboards, R5 AI feature, R6 responsive UI, R7 deployment, R8 Git history, R9 README, R10 SDLC document.
Status values: Pass, Fail, Not run. Fill in Actual and Status only after running the test.

## A. Automated suites (run from the server folder)

| ID | Command | Covers | Expected | Actual | Status |
|---|---|---|---|---|---|
| AU1 | `npm run test:unit` | Models, validation, slots, ownership, booking rules, AI safety, AI service | All 7 files pass | All 7 unit test files passed | Pass |
| AU2 | `npm run test:live` (fresh server restart first) | Auth, booking, lists, get, reschedule and cancel, doctor status | All 6 files pass | All 6 live test files passed | Pass |
| AU3 | `node scripts/test-ai-live.js` | AI endpoint: 401, 400, urgent, grounding, rate limit | All checks pass | All AI endpoint checks passed | Pass |
| AU4 | `node scripts/evaluate-ai.js` | AI evaluation (12 cases) | Results written to docs/ai-evaluation.md | 12 cases run, results in docs/ai-evaluation.md | Pass |

## B. Authentication (R1)

| ID | Preconditions | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|
| A1 | Logged out | Register with a new email and an 8+ character password | Redirected to /dashboard, navbar shows name | Registered, landed on dashboard | Pass |
| A2 | Account from A1 | Register again with the same email | Red message: account already exists | Duplicate email message shown | Pass |
| A3 | Logged out | Submit register form empty | Inline messages, no request sent | Inline errors, no request sent | Pass |
| A4 | Logged out | Register with a 3-character password | Inline password error | Inline password error | Pass |
| A5 | Logged out | Log in with the wrong password | Red message: Invalid email or password; no token stored | Invalid email or password, no token stored | Pass |
| A6 | Logged out | Log in as the demo patient | /dashboard | Demo patient reached /dashboard | Pass |
| A7 | Logged out | Log in as Dr. Priya Nair | /doctor/dashboard | Priya reached /doctor/dashboard | Pass |
| A8 | Logged in | Refresh any page | Still logged in | Still logged in after refresh | Pass |
| A9 | Logged in | Click Log out | Home page, token removed, protected pages redirect to login | Logout cleared token, protected page redirected | Pass |
| A10 | Logged out | Open /dashboard directly | Redirect to /login, then back to /dashboard after login | Redirected to login, returned to dashboard | Pass |
| A11 | Logged in as patient | Open /doctor/dashboard | Redirected to /dashboard | Patient redirected from doctor dashboard | Pass |
| A12 | Logged in | Set hbs_token to garbage in DevTools, refresh | Login page with session expired message | Session expired message, token removed | Pass |

## C. Browsing doctors (R2)

| ID | Preconditions | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|
| B1 | None | Open /doctors | 6 doctor cards with specialty pictures | 6 doctor cards with pictures | Pass |
| B2 | None | Filter specialty Cardiology | 1 doctor | 1 doctor, Dr. Alan Rivera | Pass |
| B3 | None | Type PRIYA in the name box | 1 doctor, after a short pause | Name search PRIYA returned 1 doctor | Pass |
| B4 | None | Location dallas | 2 doctors | Location dallas returned 2 doctors | Pass |
| B5 | None | Cardiology plus location fort | No-doctors message | No-doctors message shown | Pass |
| B6 | None | Click a service card on Home | Doctors page already filtered | Dermatology preselected from Home card | Pass |
| B7 | None | Open a doctor profile, then refresh | Same profile loads | Profile reloaded after refresh | Pass |
| B8 | None | Open /doctors/000000000000000000000000 | Doctor not found page with back button | Doctor not found page shown | Pass |
| B9 | None | Open /doctors/abc | Same friendly page | Same friendly page for bad ID | Pass |
| B10 | None | Open /nothing-here | Page not found | Page not found shown | Pass |

## D. Booking and appointments (R3, R4)

| ID | Preconditions | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|
| C1 | Patient logged in | Pick a future working day on a doctor page | 30-minute slots shown | 16 slots, 8:00 AM to 3:30 PM | Pass |
| C2 | Patient logged in | Pick a day the doctor does not work | Not-working message | Not-working message on Sunday | Pass |
| C3 | Patient logged in | Select a slot, leave reason empty, confirm | Inline reason error | Inline reason error | Pass |
| C4 | Patient logged in | Select a slot, add a reason, confirm | Green success, slot becomes disabled | Success message, slot disabled | Pass |
| C5 | After C4 | Open /dashboard | New pending appointment, counts updated | Pending appointment on dashboard, counts updated | Pass |
| C6 | Two browser tabs | Select the same slot in both, book in tab A then tab B | Tab B shows slot already booked and refreshes | Second tab showed slot already booked | Pass |
| C7 | Patient with a pending appointment | Reschedule to another free slot | Time updated | Reschedule updated the time | Pass |
| C8 | Patient with a confirmed appointment | Reschedule | Status returns to pending | Confirmed appointment returned to pending after reschedule | Pass |
| C9 | Patient with a pending appointment | Cancel, choose Keep it | Nothing changes | Keep it left appointment unchanged | Pass |
| C10 | Same | Cancel, confirm | Moves to past and cancelled, cancelled by patient | Cancelled by patient, moved to past and cancelled | Pass |
| C11 | After C10 | Book the freed slot with another patient | Succeeds | Freed slot booked by another patient | Pass |
| C12 | Patient with no appointments | Open /dashboard | Friendly empty message with link | Empty-state message with link | Pass |
| C13 | Logged out | Open a doctor page | Log in to book button, returns to this doctor after login | Log in to book button, returned to doctor after login | Pass |
| C14 | Doctor logged in | Open a doctor page | Only patients can book message | Doctor saw only-patients-can-book message | Pass |
| C15 | Patient logged in | Double-click Confirm booking | One appointment only | Double click created one appointment | Pass |
| C16 | Doctor logged in with a pending appointment | Confirm it | Status confirmed; patient sees it after refresh | Doctor confirmed, patient saw confirmed | Pass |
| C17 | Doctor logged in | Decline a pending appointment | Cancelled by doctor, slot free again | Declined: cancelled by doctor, slot free again | Pass |
| C18 | Confirmed future appointment | Look at Mark completed | Disabled until start time | Mark completed disabled for future appointment | Pass |
| C19 | Doctor logged in | Filter by status | Only matching rows | Status filter showed only matching rows | Pass |
| C20 | Doctor A logged in | Check dashboard | Only Doctor A appointments; patient name only, no email | Patient name and reason only, no email or insurer | Pass |

## E. Ownership and authorization (R1, R3)

| ID | Preconditions | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|
| O1 | Postman, patient token | GET another patient appointment id | 404 | 404 for another patient's appointment | Pass |
| O2 | Postman, patient token | PATCH or DELETE another patient appointment | 404, data unchanged | PATCH and DELETE gave 404, owner's appointment unchanged | Pass |
| O3 | Postman, patient token | GET /api/appointments/doctor/mine | 403 | 403 for patient on doctor route | Pass |
| O4 | Postman, doctor token | POST /api/appointments | 403 | 403 for doctor booking | Pass |
| O5 | Postman, no token | GET /api/appointments/mine | 401 | 401 without token | Pass |

## F. AI assistant (R5)

| ID | Preconditions | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|
| I1 | Logged out | Open Home | Log in to use the assistant | Guest saw log in to use the assistant | Pass |
| I2 | Patient logged in | Describe an itchy rash | Doctor cards with a dermatologist | Dermatology doctor shown with reason | Pass |
| I3 | Patient logged in | Type: I have chest pain | Red emergency alert, no doctor cards | Emergency alert, no doctor cards | Pass |
| I4 | Patient logged in | Type: tell me a joke about dragons | No-match message or friendly unavailable message | No-match or friendly message shown | Pass |
| I5 | Patient logged in | Paste 600 characters | Box stops at 500 | Box stopped at 500 characters | Pass |
| I6 | Patient logged in | Click a recommendation | Opens that doctor profile | View profile opened doctor page | Pass |
| I7 | Bad AI key, server restarted | Describe an itchy rash | Fallback doctors with keyword-based badge | Fallback doctors with keyword-based badge | Pass |
| I8 | AI_RATE_LIMIT=3, restarted | Send 4 emergency messages | Fourth shows too-many-uses message | Fourth request showed too-many-uses message | Pass |
| I9 | Server stopped | Submit | Cannot reach the server with Try again | Cannot reach server message with Try again | Pass |
| I10 | Any | Disclaimer visible in every state | Not medical advice text always shown | Disclaimer visible in all states | Pass |

## G. States, layout and accessibility (R6)

| ID | Preconditions | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|
| S1 | Server stopped | Open /doctors | Red alert with Try again; works after restart | Red alert with Try again, recovered after restart | Pass |
| S2 | None | Throttle network to Slow 3G | Spinners shown, no layout break | Spinner shown on Slow 3G, no layout break | Pass |
| S3 | None | Desktop 1280 px wide: Home, Doctors, Detail, Dashboard | No horizontal scroll, readable text | Desktop pages readable, no sideways scroll | Pass |
| S4 | None | Tablet 768 px wide: same pages | Cards in two columns, navbar readable | Tablet layout in two columns | Pass |
| S5 | None | Mobile 375 px wide: same pages | One column, hamburger menu works, no overflow | Mobile one column, hamburger works, no overflow | Pass |
| S6 | None | Keyboard only (Tab) through login and booking | Logical order, visible focus, all controls reachable | Keyboard order logical, focus visible | Pass |
| S7 | None | Remove a specialty image file temporarily | Colored fallback banner, no broken image | Colored fallback banner, no broken image | Pass |
| S8 | None | Remove the hospital background file temporarily | Page still readable | Page readable without background | Pass |
| S9 | Any | Browser console during A, B, C, F tests | No red errors | No red console errors | Pass |
| S10 | Any | Server window during all tests | No Unhandled error lines | No Unhandled error lines in server window | Pass |

## H. Persistence and restart

| ID | Preconditions | Steps | Expected | Actual | Status |
|---|---|---|---|---|---|
| P1 | An appointment exists | Restart the server, reload the dashboard | Appointment still there | Appointment survived server restart | Pass |
| P2 | Logged in | Restart the server, refresh | Still logged in (token still valid) | Still logged in after server restart | Pass |
| P3 | After tests | Check Compass for leftover test users or appointments | Only the 7 seeded users and intentional appointments | Only 7 seeded users and 6 doctors remain | Pass |

## I. Security spot checks

| ID | Steps | Expected | Actual | Status |
|---|---|---|---|---|
| X1 | Search Network responses for the AI key prefix | Not found | AI key prefix not found in responses | Pass |
| X2 | Search the client build (dist) for secrets | Not found | No secrets in production build | Pass |
| X3 | Register with role doctor in the request body (Postman) | Account is a patient | role=doctor in body ignored, account is a patient | Pass |

## Defects found and fixed

(List each failed test, the cause, the fix and the retest result. Keep failures; do not delete them.)
