#

> Each rule is in English (for AI agents). The `→` line is the Uzbek explanation (for you).
Har qoida inglizcha (agent uchun). `→` qatori — o'zbekcha izoh.
>

---

## ALWAYS (minimum, every endpoint)

- [ ]  `[ ]` **Validate all input (Zod, Joi, class-validator).**
→ Har input validatsiya qilinsin.
- [ ]  `[ ]` **Prevent SQL injection (parameterized queries / ORM).**
→ SQL injection'дан himoya.
- [ ]  `[ ]` **Error handling with correct HTTP status codes.**
→ Xato boshqaruvi + to'g'ri status kod.
- [ ]  `[ ]` **Keep secrets (passwords, tokens, keys) in env, not in code.**
→ Sirlar env'да.
- [ ]  `[ ]` **Never leak sensitive data into logs or responses.**
→ Sensitive ma'lumot log/javobга chiqмаsin.
- [ ]  `[ ]` **Check authentication AND authorization (ownership).**
→ Auth + egalik tekshiruvi.
- [ ]  `[ ]` **No magic numbers/strings; clear naming and return types.**
→ Sehrli qiymat yo'q; aniq nom va tip.

---

## 1. Security

- [ ]  `[ ]` **Validate + sanitize every external input.**
→ Har tashqi input validatsiya + sanitizatsiya.
- [ ]  `[ ]` **Use ORM / prepared statements (SQL & NoSQL).**
→ ORM / prepared statement.
- [ ]  `[ ]` **Correct authentication (JWT, session, OAuth).**
→ To'g'ri autentifikatsiya.
- [ ]  `[ ]` **Role-based access control (RBAC); check resource ownership per request.**
→ RBAC + har so'rovда resurs egaligi tekshirilsin (Broken Access Control — eng ko'p xato).
- [ ]  `[ ]` **Hash passwords (bcrypt/argon2) — never plaintext.**
→ Parol hash qilinsin, hech qachon ochiq emas.
- [ ]  `[ ]` **JWT expiration + refresh token logic.**
→ Token muddati + refresh.
- [ ]  `[ ]` **CSRF protection for cookie-based auth.**
→ CSRF himoyasi.
- [ ]  `[ ]` **Configure CORS to allow only required origins.**
→ CORS faqat kerakli origin'larga.
- [ ]  `[ ]` **Rate limiting (DDoS, brute-force).**
→ Rate limiting.
- [ ]  `[ ]` **Security headers (helmet: HSTS, X-Frame-Options).**
→ Xavfsizlik header'lari.
- [ ]  `[ ]` **Check dependency vulnerabilities (npm audit, Snyk).**
→ Dependency zaifliklari tekshirilsin.
- [ ]  `[ ]` **Protect against mass assignment (whitelist fields).**
→ Mass assignment'дан himoya.
- [ ]  `[ ]` **Guard against SSRF (validate user-supplied URLs).**
→ SSRF'дан himoya — foydalanuvchi URL'ini tekshir.

---

## 2. Input Validation & Data Integrity

- [ ]  `[ ]` **Validate body, query, params, headers — all external data.**
→ Barcha tashqi manbalar validatsiya.
- [ ]  `[ ]` **Check type, format, range, length.**
→ Tip, format, diapazon, uzunlik.
- [ ]  `[ ]` **Use schema validation (Zod/Joi), not manual checks.**
→ Schema bilan, qo'lda emas.
- [ ]  `[ ]` **Return clear validation error messages.**
→ Aniq validatsiya xatosi.
- [ ]  `[ ]` **Use whitelist approach (accept only allowed).**
→ Whitelist yondashuvi.
- [ ]  `[ ]` **Validate file uploads (type, size, name).**
→ Fayl yuklash tekshirilsin.

---

## 3. Error Handling

- [ ]  `[ ]` **Central error handler (middleware).**
→ Markaziy error handler.
- [ ]  `[ ]` **Correct HTTP status codes (400, 401, 403, 404, 409, 422, 500).**
→ To'g'ri status kodlari.
- [ ]  `[ ]` **Catch unhandled exceptions/rejections.**
→ Ushlanmagan exception'lar ushlansin.
- [ ]  `[ ]` **Standard error response format.**
→ Standart xato formati.
- [ ]  `[ ]` **Never expose internal error details (no stack traces) to clients.**
→ Ichki xato detallari mijozга chiqmasin.
- [ ]  `[ ]` **Handle edge cases: null, empty, missing resource.**
→ Chekka holatlar.
- [ ]  `[ ]` **Graceful shutdown (handle SIGTERM).**
→ Graceful shutdown.
- [ ]  `[ ]` **Report errors to monitoring (Sentry).**
→ Monitoringга yuborilsin.

---

## 4. API Design

- [ ]  `[ ]` **Consistent RESTful conventions (or GraphQL schema).**
→ Izchil API konvensiyasi.
- [ ]  `[ ]` **Resource names: plural nouns (/users, /orders).**
→ Resurs nomlari ko'plik ot.
- [ ]  `[ ]` **Correct HTTP methods (GET, POST, PUT, PATCH, DELETE).**
→ To'g'ri metodlar.
- [ ]  `[ ]` **Version the API (/v1/, /v2/).**
→ API versiyalansin.
- [ ]  `[ ]` **Paginate large lists; support filter/sort/search.**
→ Pagination + filter/sort/search.
- [ ]  `[ ]` **Consistent response format.**
→ Izchil javob formati.
- [ ]  `[ ]` **Idempotency for PUT/DELETE and critical operations (idempotency key).**
→ Idempotency — pul/buyurtmа kabi amallarда takrorга chidamlilik.
- [ ]  `[ ]` **Document the API (Swagger/OpenAPI).**
→ API hujjatlansin.

---

## 5. Database (Postgres)

- [ ]  `[ ]` **Add indexes selectively (WHERE/JOIN/ORDER BY columns); over-indexing slows writes.**
→ Index tanlab qo'yilsin — ortiqcha index yozishni sekinlashtiradi.
- [ ]  `[ ]` **Composite index column order matters (most selective / most used first).**
→ Composite index tartibi muhim.
- [ ]  `[ ]` **Avoid N+1 queries (eager loading / JOIN).**
→ N+1 query'дан qoch.
- [ ]  `[ ]` **Use transactions for atomic operations.**
→ Atomar amallar transaction ichида.
- [ ]  `[ ]` **Use optimistic locking (version column) to prevent lost updates.**
→ Optimistic locking — yo'qolgan update'дан himoya.
- [ ]  `[ ]` **Choose correct transaction isolation level for financial operations.**
→ Moliyaviy amallар uchun to'g'ri izolyatsiya darajasi.
- [ ]  `[ ]` **Configure connection pooling (PgBouncer for multiple instances).**
→ Connection pooling sozlansin.
- [ ]  `[ ]` **Verify slow queries with EXPLAIN ANALYZE (not guesswork).**
→ Sekin query'ni EXPLAIN ANALYZE bilan tekshir.
- [ ]  `[ ]` **Version-control migrations; have a backup strategy.**
→ Migration versiyalansin, backup bo'lsin.

---

## 6. Performance & Scalability

- [ ]  `[ ]` **Cache with Redis when the same heavy query repeats and data is not too volatile.**
→ Takroriy og'ir query'ни cache qil (lekin tez o'zgaradigan ma'lumotni emas).
- [ ]  `[ ]` **Always set TTL on cache keys; have an invalidation strategy.**
→ Cache key'да doimo TTL + invalidatsiya.
- [ ]  `[ ]` **Prevent cache stampede (lock or stale-while-revalidate).**
→ Cache stampede'дан himoya.
- [ ]  `[ ]` **Offload heavy work to background jobs/queues.**
→ Og'ir ishlar fonда.
- [ ]  `[ ]` **Don't block the event loop (offload CPU-heavy work).**
→ Event loop'ни bloklama.
- [ ]  `[ ]` **Use streams for large files/responses.**
→ Katta fayllar stream bilan.
- [ ]  `[ ]` **Compress responses (gzip, brotli).**
→ Javob siqilsin.
- [ ]  `[ ]` **Design stateless services for horizontal scaling.**
→ Stateless dizayn.

---

## 7. Resilience (external dependencies)

- [ ]  `[ ]` **Retry transient failures with exponential backoff + jitter; cap retries.**
→ Vaqtinchalik xatolарни backoff + jitter bilan retry qil (4xx'ни emas).
- [ ]  `[ ]` **Use a circuit breaker for failing external services.**
→ Ishlamayotgan tashqi servisga circuit breaker.
- [ ]  `[ ]` **Use idempotency keys so retries don't duplicate effects.**
→ Idempotency key — retry dublikat yaratmasin.
- [ ]  `[ ]` **Set timeouts on all external calls.**
→ Tashqi chaqiruvларга timeout.

---

## 8. Code Quality & Architecture

- [ ]  `[ ]` **Single Responsibility per module.**
→ Bir modul — bir mas'uliyat.
- [ ]  `[ ]` **Separate concerns: controller / service / repository.**
→ Qatlamларни ajrat.
- [ ]  `[ ]` **Keep business logic out of controllers (service layer).**
→ Biznes-logika controller'дан tashqarида.
- [ ]  `[ ]` **Abstract data access (repository pattern).**
→ DB kirish abstraksiyalansin.
- [ ]  `[ ]` **Use dependency injection.**
→ Dependency injection.
- [ ]  `[ ]` **Separate configuration from code.**
→ Konfiguratsiya kod'дан ajratilsin.
- [ ]  `[ ]` **Apply DRY / KISS / YAGNI; no `any`, strict TS.**
→ DRY/KISS/YAGNI; `any` yo'q.

---

## 9. Observability

- [ ]  `[ ]` **Structured logging (JSON) with log levels.**
→ Structured logging.
- [ ]  `[ ]` **Use request/correlation IDs for tracing.**
→ Correlation ID.
- [ ]  `[ ]` **Expose a health check endpoint (/health).**
→ Health check endpoint.
- [ ]  `[ ]` **Collect metrics (request rate, error rate, p50/p95/p99 latency).**
→ Metrika — p99'ни kuzat, o'rtachани emas.
- [ ]  `[ ]` **Set up alerting on error-rate spikes.**
→ Alerting.
- [ ]  `[ ]` **Distributed tracing (if microservices).**
→ Distributed tracing (mikroservисда).

---

## 10. Testing

- [ ]  `[ ]` **Unit tests (service, util, business logic).**
→ Unit test.
- [ ]  `[ ]` **Integration tests (DB, external services).**
→ Integration test.
- [ ]  `[ ]` **API/E2E tests for endpoints.**
→ API/E2E test.
- [ ]  `[ ]` **Test auth/authorization paths.**
→ Auth yo'llари test qilinsin.
- [ ]  `[ ]` **Isolate test DB from production.**
→ Test DB izolyatsiyalansин.
- [ ]  `[ ]` **Cover edge cases and error states.**
→ Chekka holat va xatolar.

---

## 11. Deployment & Tooling

- [ ]  `[ ]` **Provide .env.example; use a secrets manager (Vault, AWS Secrets).**
→ .env.example + secrets manager.
- [ ]  `[ ]` **Containerize (Dockerfile).**
→ Konteynerlashtir.
- [ ]  `[ ]` **CI/CD pipeline (test → build → deploy).**
→ CI/CD.
- [ ]  `[ ]` **Run DB migrations automatically on deploy.**
→ Migration deploy'да avtomatik.
- [ ]  `[ ]` **Zero-downtime deploy with rollback strategy.**
→ Zero-downtime + rollback.
- [ ]  `[ ]` **Graceful shutdown on deploy.**
→ Deploy'да graceful shutdown.

---

## Most Dangerous Mistakes

- [ ]  `[ ]` Not validating input → injection, corrupt data.
`[ ]` Storing passwords in plaintext → catastrophe.
`[ ]` Sensitive data in logs/responses → data leak.
`[ ]` Exposing error details to clients → internals leaked.
`[ ]` Skipping authorization checks → unauthorized access.
`[ ]` N+1 queries → DB slowdown.
`[ ]` Related ops without a transaction → data inconsistency.
