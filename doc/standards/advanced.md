#

> **Scale:** 10k–1M users · **Stack:** React/TS + Node/Postgres/Redis
These are not binary checks — each is a decision with trade-offs, costs, and failure modes.
Bu binary checklist emas — har biri trade-off, narx va buzilish mexanikаси bilan qaror.
>

---

# PART A — TRADE-OFFS (when YES / when NO)

## A1. React memoization

- [ ]  `[ ]` **Memoize only when: computation is expensive (>1ms), OR result is passed to a memo() child, OR it's a dependency of another hook.**
→ Faqat shu uch holатда memoize qil.
- [ ]  `[ ]` **Do NOT memoize trivial computations or values used only in the current render.**
→ Oddий hisоб yoki faqat shu render'dаги qiymатни memoize qилма.
- [ ]  `[ ]` **Measure render time before and after (React DevTools Profiler). If diff <1ms, remove it.**
→ O'lchаб ko'r — farq <1ms bo'lса, olиб tashла.
→ **Buzilish:** Keraksiz memoization bundle'ни kattalashтиради, GC bosим qo'shади, foyda bermайди.

## A2. Server vs Client state

- [ ]  `[ ]` **Anything from the server is server state — manage with React Query/SWR.**
→ Server'дан kelган hammа narsа server state.
- [ ]  `[ ]` **Never copy server data into useState; derive it with useMemo instead.**
→ Server data'ни useState'ga ko'чирма — derive qil.
→ **Buzilish:** Ikki source of truth → eski ma'lumот ko'ринади ("yangiладим, lekin ko'ринмайди").

## A3. Optimistic updates

- [ ]  `[ ]` **Use optimistic UI for low-risk, high-success actions (like, toggle). Always implement rollback on failure.**
→ Past xавfli amаллар uchun; fail bo'lса rollback shart.
- [ ]  `[ ]` **Do NOT use optimistic UI for payments, deletes, or irreversible actions.**
→ To'lов/o'chириш uchun ishlатма — server tasdиғини kut.
→ **Buzilish (rollback yo'q):** UI "muvаффақият" deydi, server'дa saqланмаган → ma'lumот yo'qoлади.

## A4. Normalization vs denormalization

- [ ]  `[ ]` **Start normalized (3NF). Denormalize only after EXPLAIN ANALYZE shows a real JOIN bottleneck.**
→ Normalizatsiyадан boshla; faqat o'lчанган muаммодан keyин denormalize.
→ **Buzilish:** Erta denormalizatsiya → har update'дa bir nechа joyни yangилаш kerак, unutса nomuvofiqлик.

## A5. Caching invalidation

- [ ]  `[ ]` **Cache when the same query repeats and data isn't highly volatile. Start with TTL (simplest, fewest bugs).**
→ TTL'дан boshла.
- [ ]  `[ ]` **Use explicit invalidation only when the stale window is unacceptable.**
→ Stale qabул qилинмаса, invalidatsiya qo'ш.
→ **Buzilish:** Invalidation'ни unutса → cheksiz eski ma'lumот. Eng qiyин debug, chunki kod to'g'ри, cache eski.

---

# PART B — FAILURE MODES (mechanics + detection)

## B1. useEffect infinite loop

- [ ]  `[ ]` **Don't put unstable object/function references in the dependency array; depend on primitives (obj.id) or stabilize with useMemo/useCallback.**
→ Object dependency har render yangi reference → effect qайта ishлайди → state o'zгарса → cheksiz loop.
→ **Belgi:** Network tab'дa bir xil request soniyаsiga o'нлаб martа.

## B2. Race condition (async)

- [ ]  `[ ]` **Cancel stale async results (cancelled flag or AbortController) so out-of-order responses don't overwrite newer ones.**
→ Tez yozишда eski request javоби yangини bosиб o'tиши mumkin.
→ **Belgi:** Development'дa ko'ринмайди (localhost tez), production'дa sekin tarmоqда doim.

## B3. Memory leak

- [ ]  `[ ]` **Clean up every subscription, listener, interval, and timeout on unmount.**
→ Cleanup'siz listener/interval → har unmount'дa to'plаниб borади.
→ **Diagnostika:** Chrome DevTools → Memory → heap snapshot oldин/keyин solишtир. Detached node o'сса — leak.

## B4. N+1 queries

- [ ]  `[ ]` **Use eager loading / JOIN instead of querying inside a loop.**
→ 100 elemент → 1 + 100 query. ORM buni yashиради.
→ **Belgi:** Endpoint sekin (>500ms), DB log'дa bir xil shaклдаги yuzlаб query.

## B5. Connection pool exhaustion

- [ ]  `[ ]` **Always release connections (close transactions in finally); size the pool correctly; avoid long-held connections.**
→ Connection qайтарилмаса → pool tugайди → app to'satдан o'lади.
→ **Belgi:** "Too many connections" / "pool timeout". Past yukда ishлайди, yuk oshганда halok bo'lади.

---

# PART C — ADVANCED TOPICS (missing from intermediate)

## C1. Idempotency

- [ ]  `[ ]` **Generate an idempotency key (UUID) per critical action; backend returns the prior result if the key was already processed.**
→ Retry/double-click dublikат yaratмаsин.
→ **Buzilish:** Dublikат to'lов/buyurтма — real moliyaviy zarar.

## C2. Retry with exponential backoff + jitter

- [ ]  `[ ]` **Retry only transient errors (timeout, 503, 429), with exponential backoff + random jitter, capped attempts.**
→ Naive retry → thundering herd (servис tiklanарканда qайта qulайди).
- [ ]  `[ ]` **Do NOT retry 400/401/404 — the error won't change.**
→ Bu xatоларни retry qилма.

## C3. Circuit breaker

- [ ]  `[ ]` **Open the breaker after N consecutive failures so requests fail fast instead of blocking on a dead service.**
→ O'lик servисни har safар kutиш sизниng app'ни ham bloklайди.

## C4. Concurrency / lost update

- [ ]  `[ ]` **Use optimistic locking (version column, WHERE version = X) for concurrent edits.**
→ Ikki kishи bir vaqtда tahrirласа, biрининг o'zгариши yo'qolади.

## C5. Transaction isolation

- [ ]  `[ ]` **Use the correct isolation level (SERIALIZABLE or explicit locking) for financial/calculation operations.**
→ Default READ COMMITTED pul-hisob amаллари uchun yetмайди.
→ **Buzilish:** Balans noto'g'ri — "pul yo'qоlади/paydо bo'лади".

## C6. OWASP essentials

- [ ]  `[ ]` **Broken Access Control: verify resource OWNERSHIP per request, not just login.**
→ Eng ko'p uchраydиган zaiflик.
- [ ]  `[ ]` **Injection, crypto failures, SSRF, security misconfiguration — review each.**
→ Har birини alohида ko'rib chiq.

## C7. Observability (three pillars)

- [ ]  `[ ]` **Logs (what happened) + Metrics (how much/fast) + Traces (request path across services).**
→ Uch ustun.
- [ ]  `[ ]` **Watch p99 latency, not the average — the average hides the worst 1% of users.**
→ p99'ни kuzат, o'rtачани emas.

---

# PART D — STACK-SPECIFIC

## React

- [ ]  `[ ]` **Mark "use client" only on interactive leaf components (preserve SSR benefits).**
→ Butun daraxтни client qилма.
`[ ]` **Pair Suspense with an error boundary so a failed lazy load doesn't crash the page.**
→ Suspense + error boundary birga.
`[ ]` **Use react-hook-form (uncontrolled) for large forms to avoid per-keystroke re-renders.**
→ Katta formада controlled input har keystroke re-render.

## TypeScript

- [ ]  `[ ]` **Prefer `unknown` + narrowing over `any`.**
→ `unknown` tekширишга majbур qилади.
`[ ]` **Model state with discriminated unions to catch invalid-state access at compile time.**
→ Discriminated union noto'g'ri holат-murожаатини kompilyatsiyада tutади.
`[ ]` **Validate API responses with Zod at runtime.**
→ TS faqat compile-time; Zod runtime.

## Node

- [ ]  `[ ]` **Don't block the event loop — offload CPU-heavy work to worker threads/services.**
→ Og'ир CPU ishi barchа so'rovни bloklайди.
`[ ]` **Use streams for large payloads; implement graceful shutdown on SIGTERM.**
→ Stream + graceful shutdown.

## Postgres

- [ ]  `[ ]` **Index selectively; composite index order matters; verify with EXPLAIN ANALYZE.**
→ Tanlаб index; tartиб muhим; o'lчаб tekшир.
`[ ]` **Use PgBouncer when many instances exhaust connections.**
→ Ko'p instance → PgBouncer.

## Redis

- [ ]  `[ ]` **Always set TTL; prevent cache stampede; treat Redis as a cache, not the source of truth.**
→ TTL doimо; stampede'дан himоя; Redis — cache, manба emas.

---

# Closing

- [ ]  `[ ]` **Intermediate knows the rule; advanced knows its limits, cost, and failure mechanics.**
→ Intermediate qoидани bilади; advanced qoідаning chegарасини, narхини, buzilишини bilади.
- [ ]  `[ ]` **A perfectly engineered system that solves the wrong problem is still a failure.**
→ Noto'g'ри narsани qурган mukаммал tizim ham muvаффақиятsизлик.
