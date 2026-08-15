# Customer Portal — Palo Alto Security

A self-service customer portal prototype for a fictional enterprise security vendor, "Palo Alto Security" (hardware appliances and software/subscription products: firewalls, endpoint & XDR, SASE, SIEM, email security, cloud security, VPN, threat intelligence). Static vanilla HTML/CSS/JS, no framework, no build step — same architecture as the sibling `partner-portal` project.

Login is mocked (any non-empty email/password works) and all data — products, purchases, entitlements, license keys, downloads, team members, roles, and invites — is synthetic, defined in the CSV files under `data/`.

## Running it

This app fetches its CSV data with `fetch()`, which most browsers block under `file://`. Serve it locally instead:

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## What you can do

- Sign in with the pre-filled demo credentials
- Browse **My Products** and drill into a product's orders, entitlements, license keys, and downloads
- Use the **Configurator** to pick a product, set quantity/support tier/term, add compatible add-ons, see a live price, and place a self-service order
- Track every **Order** — status, provisioning, and invoice — in one place, with an order detail drill-in showing a live status timeline
- View all **Entitlements & Licenses** with seat usage and copy-to-clipboard license keys
- Download software from the **Downloads** page, and download invoices from an order's detail page
- Manage **Team & Access**: invite teammates, create custom roles with specific permissions, and manage pending invitations

## Notes on design decisions

- **Desktop-only, no responsive breakpoints.** This mirrors `partner-portal`'s fixed-viewport shell (sidebar + header + scrolling body). It's an intentional constraint, not an oversight — there's a `min-width` guard so a too-narrow window scrolls instead of breaking.
- **Downloads and invoices are real but synthetic.** Clicking "Download" triggers an actual browser download (via a generated `Blob`), but the file is a small text manifest describing the release or invoice — not a real installer binary or PDF. This keeps the interaction honest while still feeling real.
- **Order progression is simulated.** After placing an order in the Configurator, its status advances on its own — Processing → Provisioning → Fulfilled — over about 10 seconds via client-side timers, so the Orders page and Dashboard visibly update. There's no real backend or fulfillment system behind this; it's a demo simulation of what a real provisioning pipeline would look like.
- **No real backend.** All data lives in memory after being loaded from the CSVs; changes made in the session (placing an order, inviting a user, creating a role, revoking an invite, changing someone's role) are not persisted and reset on reload.
