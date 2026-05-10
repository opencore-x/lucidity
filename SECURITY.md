# Security Policy

## Reporting a vulnerability

If you discover a security issue in Lucidity, please report it privately so it can be triaged before public disclosure.

**Email:** ankit@sejw.al

Please include:

- A description of the issue and its potential impact
- Steps to reproduce, or a proof of concept if you have one
- The affected component (e.g., `apps/api`, `packages/mcp-server`, mobile app)
- Your contact info if you're open to follow-up questions

You should expect an initial response within a few days. Critical issues will be prioritized.

## Scope

In scope:

- The Hono API (`apps/api`)
- The MCP server (`packages/mcp-server`)
- The mobile app (`apps/mobile`)
- The web app (`apps/web`)
- Authentication, authorization, and API key handling
- Data exposure or unintended access between users

Out of scope:

- Issues in third-party services we depend on (report those upstream — Clerk, Neon, Anthropic, etc.)
- Social-engineering scenarios that require an already-compromised user
- Denial-of-service or rate-limit gaming on free-tier infrastructure

## Disclosure timeline

Once an issue is confirmed and fixed, we'll work with the reporter on a
coordinated disclosure. Credit will be given to reporters who want it.
