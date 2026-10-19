\# Hospital Booking System: REST API Contract



Status: approved. All data is fictional demo data.



\## Conventions



\- Base path `/api`, JSON bodies, header `Authorization: Bearer <token>`.

\- Success bodies are the resource or an array, with no wrapper.

\- Dates are ISO 8601 UTC strings. IDs are MongoDB `\_id` strings.

\- Logout has no endpoint: React deletes the token.

\- Error shape (`details` only for validation errors):



```json

{ "error": "Validation failed", "details": \[ { "field": "email", "message": "Email is required" } ] }

```



| Code | Meaning |

|---|---|

| 200 / 201 | OK / created |

| 400 | Invalid input, bad ID, or bad JSON |

| 401 | Missing, invalid or expired token, or wrong login |

| 403 | Logged in but wrong role |

| 404 | Not found, or not yours |

| 409 | Duplicate email, slot taken, or illegal status change |

| 413 | Body over 10 KB |

| 429 | Rate limit hit |

| 500 / 503 | Server fault / database or AI unavailable |



A patient requesting another person's appointment gets 404, so the API never confirms the ID exists. A wrong-role call to a role-only route gets 403.



\## Auth



| Endpoint | Auth | Request | Success | Failures |

|---|---|---|---|---|

| POST /api/auth/register | None | `{ name, email, password, insurerName? }` (role ignored) | 201 `{ token, user }` | 400, 409, 429 |

| POST /api/auth/login | None | `{ email, password }` | 200 `{ token, user }` | 400, 401 (same message for both causes), 429 |

| GET /api/auth/me | Any user | none | 200 user | 401 |

| PATCH /api/auth/me | Any user | `{ name?, insurerName? }` | 200 user | 400, 401 |



`user` = `{ \_id, name, email, role, insurerName, createdAt, updatedAt }`. Registration always creates a patient. Planned limit: 10 attempts per 15 minutes per IP.



\## Doctors (public, read only)



| Endpoint | Request | Success | Failures |

|---|---|---|---|

| GET /api/doctors | Query: `specialty`, `search`, `location`, `insurer` (all optional) | 200 array, active only, sorted by name, max 50 | 400, 429 |

| GET /api/doctors/:id | none | 200 doctor | 400, 404 |

| GET /api/doctors/:id/slots | Query: `date=YYYY-MM-DD` (clinic-local, required) | 200 `{ date, timezone, slots: \[ { startTime, endTime, available } ] }` | 400, 404 |



Doctor = `{ \_id, fullName, specialty, location, bio, consultationFee, rating, ratingCount, acceptedInsurers, workingDays, workStart, workEnd, slotMinutes }`.



\## Appointments



| Endpoint | Role | Request | Success | Failures |

|---|---|---|---|---|

| POST /api/appointments | Patient | `{ doctorId, startTime, reason }` | 201 appointment (pending) | 400, 401, 403, 404, 409 |

| GET /api/appointments/mine | Patient | Query: `status?` | 200 array, newest first | 401, 403 |

| GET /api/appointments/doctor/mine | Doctor | Query: `status?` | 200 array | 401, 403 |

| GET /api/appointments/:id | Owning patient or doctor | none | 200 appointment | 400, 401, 404 |

| PATCH /api/appointments/:id | Owning patient | `{ startTime }` (reschedule) | 200 appointment (confirmed returns to pending) | 400, 401, 404, 409 |

| PATCH /api/appointments/:id/status | Owning doctor | `{ status }`: confirmed, cancelled or completed | 200 appointment | 400, 401, 403, 404, 409 |

| DELETE /api/appointments/:id | Owning patient | none | 200 appointment (soft cancel, cancelledBy patient) | 400, 401, 404, 409 |



\- Register `/mine` and `/doctor/mine` before `/:id`.

\- Allowed status changes: pending to confirmed; pending or confirmed to cancelled; confirmed to completed only after `startTime`. All others return 409.

\- Patient view hides `holdsSlot` and `\_\_v`. Doctor view adds `patient: { \_id, name }` and never the patient's email or insurer.



\## AI



| Endpoint | Auth | Request | Success | Failures |

|---|---|---|---|---|

| POST /api/ai/recommend-doctor | Any user | `{ message }`, 1 to 500 characters | 200 (two shapes below) | 400, 401, 429, 503 |



Normal: `{ urgent: false, summary, recommendations: \[ { doctorId, reason } ], disclaimer }`.

Urgent (keyword check runs first, AI never called): `{ urgent: true, message, recommendations: \[] }`.

Every `doctorId` is verified against MongoDB. Provider failure returns 503. Planned limit: 10 requests per hour per user.



\## Health



GET /api/health returns 200 or 503 with `{ status, database, uptimeSeconds, timestamp }`.

