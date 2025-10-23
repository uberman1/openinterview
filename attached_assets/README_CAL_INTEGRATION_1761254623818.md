# Cal.com Integration Patch (ICS as Fallback Only)

This patch embeds **Cal.com** in your shareable profile (v4.1) and only shows your
**.ics download fallback** if the Cal embed can't load or no handle is configured.

## What’s in this patch
- `public/js/cal-embed.bind.js` – mounts Cal.com inline and **suppresses ICS** unless Cal fails.
- `public/index.html` – exemplar profile page snippet with a Booking card placeholder.
- `README_CAL_INTEGRATION.md` – setup notes and behavior details.

## How it behaves
1) **Primary path:** If a `data-cal-link` is present (or derivable from `data-profile-handle`),
   the Cal embed loads inside your existing booking card. No ICS elements are shown.
2) **Failure path:** If the embed script fails or no handle exists, the script unhides the
   fallback block which contains your existing ICS UI (date/time/email + "Download .ics").
3) **Booking-created:** When Cal posts a booking event, the binder hides/disables any ICS
   controls (defensive) and stores a lightweight receipt in `localStorage.oi_bookings`.

## Quick install
- Add this to your profile v4.1 page with other modules:
  ```html
  <script type="module" src="/js/cal-embed.bind.js"></script>
  ```
- Ensure your booking card has either `data-cal-link="team/event-type"` or at least
  `data-profile-handle="alice"` so the binder computes `openinterview/alice`.
- Keep your existing fallback ICS form inside `#bookingFallback` (it starts hidden).

## Configure per profile
Set on the booking card:
```html
<div id="bookingCard"
     data-cal-link="yourteam/intro-call"
     data-profile-handle="alice">
</div>
```

## Safe rollback
Remove the script import and data attributes. Your ICS flow will remain untouched.

