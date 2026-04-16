# Cal.com Integration for OpenInterview

## Overview

The profile pages now support **Cal.com** calendar integration for professional interview scheduling. This replaces the custom calendar with an embedded Cal.com booking interface, with a fallback to .ics download if the embed fails.

## How It Works

### Primary Path: Cal.com Embed
When a profile has Cal.com configured, visitors see a professional Cal.com booking interface directly in the profile. This provides:
- ✅ Real-time availability sync with Google Calendar, Outlook, etc.
- ✅ Automatic email confirmations to both parties
- ✅ Calendar invites sent automatically
- ✅ Professional scheduling experience
- ✅ Time zone detection and conversion

### Fallback Path: ICS Download
If Cal.com fails to load or isn't configured, the page automatically shows a simple fallback form where visitors can:
- Choose a date and time
- Enter their email
- Download a calendar invite (.ics file)

## Configuration

### Setting Up Cal.com (One-Time Setup)

1. **Create Cal.com account** (free):
   - Go to https://cal.com/signup
   - Sign up with your email
   - Verify your account

2. **Create an event type**:
   - In Cal.com dashboard, click "Event Types"
   - Create a new event (e.g., "30 Min Interview")
   - Set your availability hours
   - Configure meeting duration
   - Get the event link (e.g., `yourteam/30min-interview`)

3. **Connect your calendar**:
   - Go to Settings → Calendars
   - Connect Google Calendar, Outlook, or other calendars
   - Cal.com will sync with your availability

### Configuring Per Profile

Update the `data-cal-link` attribute in your profile's HTML:

```html
<div id="bookingCard" 
     data-cal-link="yourteam/30min-interview" 
     data-profile-handle="demo">
```

**Options:**

- **`data-cal-link`**: Your Cal.com event type link (e.g., `team/event-type`)
  - If set, this takes priority and Cal.com will load
  - If empty, fallback to ICS download

- **`data-profile-handle`**: Profile handle for generating Cal.com link
  - Used as fallback if `data-cal-link` is empty
  - Generates link: `openinterview/{handle}`

## Files Modified

### Created
- **`public/js/cal-embed.bind.js`** - Cal.com integration script
  - Loads Cal.com embed assets
  - Mounts inline calendar
  - Handles fallback logic
  - Stores booking receipts in localStorage

### Modified
- **`public/profile_v4_1_package/public/index.html`**
  - Updated booking card structure
  - Added Cal.com container
  - Added fallback ICS form
  - Added script import

## Technical Details

### How Cal.com Loads

1. Script checks for `data-cal-link` or `data-profile-handle`
2. Dynamically loads Cal.com CSS and JavaScript from `cal.com` CDN
3. Creates `<cal-inline>` element with the event link
4. Mounts embed in `#calEmbedContainer`

### Fallback Trigger Conditions

The ICS fallback form appears when:
- Cal.com script fails to load
- No `data-cal-link` or `data-profile-handle` is set
- Browser blocks third-party scripts

### Booking Receipts

All bookings (both Cal.com and ICS fallback) are stored in `localStorage.oi_bookings`:

```javascript
{
  ts: 1234567890,
  type: 'cal:booking' or 'ics_fallback',
  email: 'user@example.com',
  date: '2024-01-15',
  time: '10:00'
}
```

## Security & Privacy

### What Data is Shared with Cal.com
- Visitor's booking selections (date/time)
- Visitor's email address (for confirmations)
- Basic browser information (for embed rendering)

### Privacy Considerations
- Cal.com tracks usage analytics
- Consider adding Cal.com to your privacy policy
- All booking data is processed through Cal.com's servers

### Content Security Policy
If you have strict CSP, you may need to whitelist:
```
script-src 'self' https://cal.com;
style-src 'self' https://cal.com;
frame-src https://cal.com;
```

## Cost

**Cal.com Pricing:**
- ✅ **Free tier**: Unlimited events, basic features
- ✅ **No credit card required** for basic use
- ✅ **Paid tiers** available for teams and advanced features

**OpenInterview Deployment:**
- ✅ **$0 deployment cost** (client-side only)
- ✅ No server-side changes required
- ✅ No database changes required

## Testing

### Manual Testing Steps

1. **Test Cal.com embed** (with valid `data-cal-link`):
   - Open http://localhost:5000/profile_v4_1_package/public/index.html
   - Scroll to "Book a time" section
   - Verify Cal.com embed loads (may take a few seconds)
   - Select a time slot and test booking flow

2. **Test ICS fallback** (with empty `data-cal-link`):
   - Edit index.html, set `data-cal-link=""`
   - Reload page
   - Verify fallback form appears
   - Fill in date, time, email
   - Click "Download invite (.ics)"
   - Verify .ics file downloads

3. **Test booking receipt**:
   - Open browser DevTools → Console
   - Type: `JSON.parse(localStorage.getItem('oi_bookings'))`
   - Verify booking receipts are stored

## Troubleshooting

### Cal.com embed not loading
- Check browser console for errors
- Verify `data-cal-link` is correct
- Check if Cal.com is blocked by ad blockers
- Try disabling browser extensions

### Fallback form not appearing
- Check if `#bookingFallback` has class `hidden`
- Verify cal-embed.bind.js is loaded
- Check browser console for JavaScript errors

### ICS download not working
- Check if browser blocks automatic downloads
- Verify date and email are filled
- Check browser DevTools → Network tab

## Rollback

To remove Cal.com integration and restore the original calendar:

1. Remove script import from index.html:
   ```html
   <!-- Remove this line -->
   <script type="module" src="/js/cal-embed.bind.js"></script>
   ```

2. Restore original booking card HTML from git history

3. Delete `public/js/cal-embed.bind.js`

## Future Enhancements

Potential improvements:
- Add Cal.com configuration UI in profile editor
- Store Cal.com event links in database per profile
- Support multiple event types per profile
- Add booking history dashboard
- Email notifications for new bookings
- Backend integration to track bookings in PostgreSQL

## Support

**Cal.com Documentation:** https://cal.com/docs
**Cal.com Support:** https://cal.com/support
**OpenInterview Issues:** (Contact your admin)
