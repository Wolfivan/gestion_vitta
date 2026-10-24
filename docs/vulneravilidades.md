# Vulnerabilidades encontradas.

## Criticas

### Vulnerabilidad: RLS Disabled in Public
public.schema_migrations
Supabase

#### Estado
Activo

#### Descripción
Entity
public.schema_migrations
Issue
Table public.schema_migrations is public, but RLS has not been enabled.

Description
Detects cases where row level security (RLS) has not been enabled on tables in schemas exposed to PostgREST


### Vulnerabilidad: CVE-2026-90711

#### Estado
Activo

#### Descripción
Impact
proxy-addr determines which network hops are trusted proxies so that X-Forwarded-For can be believed. When an application configures a trust subnet as an IPv4-mapped IPv6 address with a short prefix, such as ::ffff:10.0.0.0/8 (the correct spelling is ::ffff:10.0.0.0/104), the subnet compiles with all-zero leading bits and matches every IPv4 address instead of the block it names. The same happens for any IPv6 trust subnet with zero leading bits, such as ::/1.

Every unauthenticated client is then trusted as a proxy at hop 0, so proxyaddr(req, trust), and therefore req.ip and req.ips in Express, returns whatever the client sends in X-Forwarded-For. This defeats IP-based access control, rate limiting, geolocation, and audit logging. The misconfiguration compiles without any error, and the same block written correctly behaves correctly, so the difference is not visible from the configuration.

Patches
Upgrade to proxy-addr 2.0.8. An IPv4 address now matches an IPv6 trust subnet only when that subnet is a genuine IPv4-mapped subnet whose prefix covers the mapped marker.

Workarounds
Write IPv4 trust subnets in plain IPv4 notation (for example 10.0.0.0/8). If IPv4-mapped IPv6 notation is required, use the full form so the prefix covers the mapped marker (for example ::ffff:10.0.0.0/104 for the 10.0.0.0/8 block).

## Altas

### Vulnerabilidad: CVE-2026-102278
#### Estado
Activo
#### Descripción
Summary
expand_() recurses once per level of brace nesting. Deeply nested input exhausts the native stack and crashes the process.

This is distinct from CVE-2026-14257 / GHSA-mh99-v99m-4gvg, which made the tail iterative (recursion on m.post, driven by how many groups are chained). Nesting depth drives a different recursion that the tail fix never touched, so the documented constant-stack-depth guarantee only ever covered chained input, not nested input.

It is also distinct from GHSA-6j4f-fj2g-mc7p, which fixed recursion in parseCommaParts(). Both payloads below still crash with that fix applied.

Two recursion sites
Comma members. Each alternative of a brace set is expanded by a recursive call, so nesting a set inside every alternative recurses once per level:

expand('{a,'.repeat(4000) + 'z' + '}'.repeat(4000))
// RangeError: Maximum call stack size exceeded
Crashes at depth 3,907 - about 15.6 KB of input.

Single set. A brace set whose body parses to a single part is expanded by a recursive call before being re-wrapped (x{{a,b}}y -> x{a}y x{b}y), which recurses once per nesting level:

expand('{'.repeat(3200) + 'a,b' + '}'.repeat(3200))
// RangeError: Maximum call stack size exceeded
Crashes at depth 3,125 - about 6.25 KB of input. This is the cheapest stack-exhaustion payload known against this package: roughly a quarter the input of GHSA-6j4f-fj2g-mc7p (29 KB), and about a tenth of minimatch's MAX_PATTERN_LENGTH (65,536).

Why max and maxLength do not help
Both crashes happen while recursing into sub-expansions, before the result set grows. The payloads produce almost no output - the single-set case yields 2 results - so neither bound is ever the limiter. expand(payload, { max: 1, maxLength: 1 }) still overflows.

Impact
Any application passing an untrusted string to expand(), directly or through minimatch / glob as a user-supplied glob pattern, can be crashed. In Node a RangeError the application does not catch terminates the process, so a server globbing user input is exposed to remote unauthenticated denial of service.

Availability only. No code execution, no data exposure.

Affected versions
Verified affected on 1.1.18, 2.1.4, 3.0.6 and 5.0.9, at near-identical depths on every line (single set: 3,125 on all four; comma members: 3,907-4,102). Not a regression from any recent fix - the gap predates them.

Patch
A maxDepth bound (default EXPANSION_MAX_DEPTH) is threaded through expand_(). Past the cap a group is treated as non-expanding and returned literally, which is how the parser already handles a group that cannot expand. This matches the existing max / maxLength caps, which truncate rather than throw, so expand() continues never to throw on any input.

The default sits far above any realistic nesting depth and well below the crash threshold.


### Vulnerabilidad: CVE-2026-102278
#### Estado
Activo
#### Descripción
Summary
expand_() recurses once per level of brace nesting. Deeply nested input exhausts the native stack and crashes the process.

This is distinct from CVE-2026-14257 / GHSA-mh99-v99m-4gvg, which made the tail iterative (recursion on m.post, driven by how many groups are chained). Nesting depth drives a different recursion that the tail fix never touched, so the documented constant-stack-depth guarantee only ever covered chained input, not nested input.

It is also distinct from GHSA-6j4f-fj2g-mc7p, which fixed recursion in parseCommaParts(). Both payloads below still crash with that fix applied.

Two recursion sites
Comma members. Each alternative of a brace set is expanded by a recursive call, so nesting a set inside every alternative recurses once per level:

expand('{a,'.repeat(4000) + 'z' + '}'.repeat(4000))
// RangeError: Maximum call stack size exceeded
Crashes at depth 3,907 - about 15.6 KB of input.

Single set. A brace set whose body parses to a single part is expanded by a recursive call before being re-wrapped (x{{a,b}}y -> x{a}y x{b}y), which recurses once per nesting level:

expand('{'.repeat(3200) + 'a,b' + '}'.repeat(3200))
// RangeError: Maximum call stack size exceeded
Crashes at depth 3,125 - about 6.25 KB of input. This is the cheapest stack-exhaustion payload known against this package: roughly a quarter the input of GHSA-6j4f-fj2g-mc7p (29 KB), and about a tenth of minimatch's MAX_PATTERN_LENGTH (65,536).

Why max and maxLength do not help
Both crashes happen while recursing into sub-expansions, before the result set grows. The payloads produce almost no output - the single-set case yields 2 results - so neither bound is ever the limiter. expand(payload, { max: 1, maxLength: 1 }) still overflows.

Impact
Any application passing an untrusted string to expand(), directly or through minimatch / glob as a user-supplied glob pattern, can be crashed. In Node a RangeError the application does not catch terminates the process, so a server globbing user input is exposed to remote unauthenticated denial of service.

Availability only. No code execution, no data exposure.

Affected versions
Verified affected on 1.1.18, 2.1.4, 3.0.6 and 5.0.9, at near-identical depths on every line (single set: 3,125 on all four; comma members: 3,907-4,102). Not a regression from any recent fix - the gap predates them.

Patch
A maxDepth bound (default EXPANSION_MAX_DEPTH) is threaded through expand_(). Past the cap a group is treated as non-expanding and returned literally, which is how the parser already handles a group that cannot expand. This matches the existing max / maxLength caps, which truncate rather than throw, so expand() continues never to throw on any input.

The default sits far above any realistic nesting depth and well below the crash threshold.


### Vulnerabilidad: CVE-2026-102276
#### Estado
Activo
#### Descripción
Summary
parseCommaParts() can exhaust the native stack and crash the process. There are two distinct ways to trigger it, both reachable from a single untrusted pattern string.

This is the parsing-side counterpart to CVE-2026-14257 / GHSA-mh99-v99m-4gvg. That fix made expand_() iterative and documented a constant-stack-depth guarantee, but parseCommaParts() was left recursive, so the guarantee only held for one of the two parsing paths.

Vector 1 - unbounded recursion on post
parseCommaParts() recursed on the remainder of the string once per brace group:

const postParts = parseCommaParts(post)   // unbounded
A brace group containing many comma-separated groups drives one recursion level per group:

expand('{' + '{a},'.repeat(7000) + 'b}')
// RangeError: Maximum call stack size exceeded
About 7,300 repetitions - roughly 29 KB of input - is enough on Node 24; roughly 6,300 (25 KB) on Node 18. The threshold is identical on every affected release line.

Vector 2 - push.apply with an unbounded array
Even with the recursion removed, parseCommaParts() spread whole arrays into an argument list:

p.push.apply(p, postParts)
parts.push.apply(parts, p)
Function.prototype.apply places one argument per element on the stack, so a single large array overflows it. This needs no recursion depth at all - the following reaches a recursion depth of exactly 1:

expand('{{x},' + 'a,'.repeat(125000) + 'b}')
// RangeError: Maximum call stack size exceeded
Threshold is about 124,300 repetitions (~249 KB). This vector was not part of the original report; it was found while verifying the fix. A patch that only de-recurses but keeps push.apply leaves a working denial of service behind.

Why max and maxLength do not help
Both crashes happen during parsing, before any expansion. The payloads produce one result per group, so output size grows linearly with input and is never the limiter. expand(payload, { max: 1, maxLength: 1 }) still overflows.

Impact
Any application that passes an untrusted string to expand() - directly, or through minimatch / glob where it is a user-supplied glob pattern - can be crashed. In Node, a RangeError that the application does not catch terminates the process, so a server that globs user input is exposed to remote unauthenticated denial of service.

minimatch's own MAX_PATTERN_LENGTH cap (65,536) does not help against vector 1: the overflow threshold sits well below it. Confirmed on minimatch 10.2.6 - a 64,003-byte pattern passes the length check and overflows both minimatch.braceExpand() and new minimatch.Minimatch().

This is an availability-only issue. No code execution and no data exposure.

Not a regression
5.0.8 and 5.0.9 overflow at the same repetition count, so the gap predates the recent advisories; those fixes simply did not reach it. Verified affected on 1.1.18, 2.1.4, 3.0.6, 5.0.8 and 5.0.9, all at an identical threshold.

Patch
parseCommaParts() is rewritten as a loop that carries the partial part across chunks, and every array append uses an element-by-element loop rather than push.apply. The redundant if (!str) return [''] guard is dropped - the loop returns [''] for the empty string on its own.

Equivalence of the old and new implementations was checked by differential testing: exhaustive over every string of {, }, ,, a up to length 7 plus 300,000 random inputs - 322,000 cases, zero mismatches.

Severity note
Scored 7.5 High under CVSS 3.1 for consistency with the other availability advisories on this package (GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895), which use the same vector. The reporter self-assessed 6.9 Medium under CVSS 4.0 (CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N).

Credit
Reported by baeseungwon1010, with a working proof of concept and a proposed patch. Vector 2 was identified during maintainer verification.


### Vulnerabilidad: CVE-2026-102276
#### Estado
Activo
#### Descripción
Summary
parseCommaParts() can exhaust the native stack and crash the process. There are two distinct ways to trigger it, both reachable from a single untrusted pattern string.

This is the parsing-side counterpart to CVE-2026-14257 / GHSA-mh99-v99m-4gvg. That fix made expand_() iterative and documented a constant-stack-depth guarantee, but parseCommaParts() was left recursive, so the guarantee only held for one of the two parsing paths.

Vector 1 - unbounded recursion on post
parseCommaParts() recursed on the remainder of the string once per brace group:

const postParts = parseCommaParts(post)   // unbounded
A brace group containing many comma-separated groups drives one recursion level per group:

expand('{' + '{a},'.repeat(7000) + 'b}')
// RangeError: Maximum call stack size exceeded
About 7,300 repetitions - roughly 29 KB of input - is enough on Node 24; roughly 6,300 (25 KB) on Node 18. The threshold is identical on every affected release line.

Vector 2 - push.apply with an unbounded array
Even with the recursion removed, parseCommaParts() spread whole arrays into an argument list:

p.push.apply(p, postParts)
parts.push.apply(parts, p)
Function.prototype.apply places one argument per element on the stack, so a single large array overflows it. This needs no recursion depth at all - the following reaches a recursion depth of exactly 1:

expand('{{x},' + 'a,'.repeat(125000) + 'b}')
// RangeError: Maximum call stack size exceeded
Threshold is about 124,300 repetitions (~249 KB). This vector was not part of the original report; it was found while verifying the fix. A patch that only de-recurses but keeps push.apply leaves a working denial of service behind.

Why max and maxLength do not help
Both crashes happen during parsing, before any expansion. The payloads produce one result per group, so output size grows linearly with input and is never the limiter. expand(payload, { max: 1, maxLength: 1 }) still overflows.

Impact
Any application that passes an untrusted string to expand() - directly, or through minimatch / glob where it is a user-supplied glob pattern - can be crashed. In Node, a RangeError that the application does not catch terminates the process, so a server that globs user input is exposed to remote unauthenticated denial of service.

minimatch's own MAX_PATTERN_LENGTH cap (65,536) does not help against vector 1: the overflow threshold sits well below it. Confirmed on minimatch 10.2.6 - a 64,003-byte pattern passes the length check and overflows both minimatch.braceExpand() and new minimatch.Minimatch().

This is an availability-only issue. No code execution and no data exposure.

Not a regression
5.0.8 and 5.0.9 overflow at the same repetition count, so the gap predates the recent advisories; those fixes simply did not reach it. Verified affected on 1.1.18, 2.1.4, 3.0.6, 5.0.8 and 5.0.9, all at an identical threshold.

Patch
parseCommaParts() is rewritten as a loop that carries the partial part across chunks, and every array append uses an element-by-element loop rather than push.apply. The redundant if (!str) return [''] guard is dropped - the loop returns [''] for the empty string on its own.

Equivalence of the old and new implementations was checked by differential testing: exhaustive over every string of {, }, ,, a up to length 7 plus 300,000 random inputs - 322,000 cases, zero mismatches.

Severity note
Scored 7.5 High under CVSS 3.1 for consistency with the other availability advisories on this package (GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895), which use the same vector. The reporter self-assessed 6.9 Medium under CVSS 4.0 (CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N).

Credit
Reported by baeseungwon1010, with a working proof of concept and a proposed patch. Vector 2 was identified during maintainer verification.


### Vulnerabilidad: CVE-2026-84292
#### Estado
Activo
#### Descripción
Impact
fast-uri serializes the port component of a URI without validating it. When recomposing the authority, fast-uri escapes the userinfo and host components but concatenates the port verbatim, so a port value that is not a sequence of digits can inject authority delimiters. For example, serializing a component whose port is @127.0.0.1:8124 produces http://trusted.example:@127.0.0.1:8124/app, demoting the intended host to userinfo and pointing the authority at an attacker-controlled host. Both fast-uri and Node's URL read the result back as the attacker's host with no error, so re-validating the built URI does not catch it.

This affects applications that build URIs from parts and assign untrusted data to the port component (for example a fixed host from configuration and a port taken from user input or a service record). The same path is reachable through serialize(), normalize(), and equal() in their object forms. A port obtained from parse() is always digits and is not affected.

Patches
This vulnerability has been patched in fast-uri 4.1.4, 3.1.7, and 2.4.6. recomposeAuthority now rejects any port that is not *DIGIT per RFC 3986. All users should upgrade.

Workarounds
If upgrading is not immediately possible, validate the port value against the RFC 3986 grammar (digits only) before passing a component to serialize(), normalize(), or equal(), and reject anything else, for example if (!/^\d*$/.test(String(port))) throw new Error('invalid port').


### Vulnerabilidad: CVE-2026-84375
#### Estado
Activo
#### Descripción
Summary
maxTotalMergeKeys does not count empty mappings. An attacker can repeatedly merge a large sequence of them and consume significant CPU without reaching the configured limit.

Example
arr: &arr [{}, {}, {}, ...] # N empty mappings
targets:
  - <<: *arr                # repeated K times
For every target, the loader iterates all N elements of arr. This results in O(N * K) work while totalMergeKeys remains unchanged.

PoC
import { performance } from 'node:perf_hooks'
import { load, YAML11_SCHEMA } from 'js-yaml'

const n = 20000

const src =
  'arr: &arr [' + '{},'.repeat(n).slice(0, -1) + ']\n' +
  'targets:\n' +
  '  - <<: *arr\n'.repeat(n)

const started = performance.now()

load(src, { schema: YAML11_SCHEMA })

console.log(`${(performance.now() - started).toFixed(1)} ms`)
Observed results:

N	YAML size	Time
800	~13 KB	~20 ms
3200	~50 KB	~180 ms
20000	~500 KB	~13 s
Impact
An attacker can submit a relatively small YAML document that causes prolonged CPU consumption despite the default maxTotalMergeKeys limit.

Fix
Count each merge-source mapping as one budget unit, in addition to counting its keys.

Difference with v5
In v3 & v4, merge is enabled by default. So, the severity score is higher.



### Vulnerabilidad: CVE-2026-84292
#### Estado
Activo
#### Descripción


## Moderadas

## Bajas