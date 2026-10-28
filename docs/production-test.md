# Production Smoke Test

Live site: https://hospital-booking-system-zeta-nine.vercel.app
Live API: https://hospital-booking-system-rx3p.onrender.com/api
Database: MongoDB Atlas, database hospital_booking_prod. All data is fictional.
Browser: private window, DevTools open (Console and Network).
Status values: Pass, Fail, Not run. Fill in Actual and Status only after running the test.

| ID | Steps | Expected | Actual | Status |
|---|---|---|---|---|
| L1 | Open the live site in a private window (it may be slow if the API was asleep) | Home page loads, styled, hero and service cards visible, no red console errors | Home loaded styled, no red console errors | Pass |
| L2 | Open /doctors | Six doctor cards with pictures, no red alert | Six doctor cards with pictures | Pass |
| L3 | On /doctors use the Cardiology filter, then clear it | One doctor, then all six return | Cardiology filter gave one doctor, clearing restored six | Pass |
| L4 | Open a doctor profile, then press F5 | The same profile reloads (the Vercel rewrite works) | Profile reloaded after refresh | Pass |
| L5 | Open /doctors/abc and /nothing-here directly in the address bar | Friendly doctor-not-found page and page-not-found page, never a Vercel 404 | Friendly not-found pages, no Vercel 404 | Pass |
| L6 | Click the theme button, then refresh | The theme switches and is remembered | Theme switched and persisted | Pass |
| L7 | Register a new patient with a fake email such as smoke.test@hospital-demo.test and an 8+ character password | Redirected to /dashboard, navbar shows the name | Registered, reached dashboard, name in navbar | Pass |
| L8 | Log out, then log in as the demo patient with the production demo password | Lands on /dashboard | Demo patient logged in with the production password | Pass |
| L9 | Log in with a wrong password | Red message: Invalid email or password | Wrong password showed invalid email or password | Pass |
| L10 | Logged in, press F5 on /dashboard | Still logged in | Still logged in after refresh | Pass |
| L11 | Log out, then open /dashboard directly | Redirected to /login | Redirected to login after logout | Pass |
| L12 | As the demo patient, open Dr. Priya Nair, pick a date about two weeks ahead, pick a slot, add a reason, confirm | Green success, the slot becomes disabled | Booked Dr. Priya Nair, slot became disabled | Pass |
| L13 | Open /dashboard | The new appointment shows as pending, counts updated | Pending appointment on dashboard, counts updated | Pass |
| L14 | Reschedule it to another free slot | The time updates | Reschedule updated the time | Pass |
| L15 | Log in as priya.nair@hospital-demo.test (doctor demo password) and open the doctor dashboard | The appointment shows with the patient name only, then Confirm turns it confirmed | Doctor saw patient name and reason only, confirmed it | Pass |
| L16 | As the patient, refresh the dashboard | The appointment shows confirmed | Patient saw confirmed after refresh | Pass |
| L17 | As the patient, cancel the appointment (Yes, cancel) | Moves to past and cancelled, cancelled by patient | Cancelled by patient, moved to past and cancelled | Pass |
| L18 | As the patient on Home, send: I have chest pain | Red emergency alert, no doctor cards | Emergency alert, no doctor cards | Pass |
| L19 | As the patient on Home, send: an itchy rash on my arm for a week | Doctor cards including a dermatologist, no keyword-based badge | Dermatology doctor shown, no keyword badge | Pass |
| L20 | In the Network tab, check request addresses and responses during the tests | Requests go to the onrender.com API, none to localhost, and no response contains the text gsk_ | Requests went to onrender.com, no localhost, no gsk_ in responses | Pass |
| L21 | DevTools device toolbar at 375 px wide: Home, Doctors, a doctor page, dashboard | One column, hamburger menu works, no sideways scroll | Mobile layout one column, menu works, no overflow | Pass |
| L22 | Console tab throughout | No red errors (CORS or otherwise) | No red console errors | Pass |
