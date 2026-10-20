\# Backend Status



Backend API complete and tested before frontend work began.



\- Unit tests: 7 files, all passing (`npm run test:unit`)

\- Live API tests: 6 files, all passing (`npm run test:live`)

\- Postman collection: `docs/hospital-booking.postman\_collection.json`

\- API contract: `docs/api-contract.md`



Known limitations: single clinic timezone, in-memory rate limiting,

no pagination, Bearer token in browser storage (XSS tradeoff).

All data is fictional demo data.

