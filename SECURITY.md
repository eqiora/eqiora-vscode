# Security

Please report vulnerabilities privately through this repository's GitHub security
advisory form. Do not put sensitive model source, access tokens or executable
payloads in a public issue.

The extension starts a native server only in trusted workspaces. Webviews use a
restrictive content security policy, local resources, KaTeX with `trust: false`,
and a fixed command allowlist. Source-derived labels use text nodes. Model
inspection has server-side response limits. Plan JSON is read-only, size-bounded
and displayed as text. There is no telemetry or implicit simulation execution.
