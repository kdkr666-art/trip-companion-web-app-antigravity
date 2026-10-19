# Trip Companion web application

This package follows the workflow in the project abstract and the later user-provided workflow: sign in, discover or create trips, invite/join, open a trip overview, chat, coordinate an itinerary, record expenses, settle balances, and keep activity and memories with past trips.

The abstract lists Bootstrap and Angular JavaScript for the front end. This first runnable interface uses standard browser JavaScript and custom responsive CSS so the local preview works without a package install. The local Node preview has sign-up/sign-in and live synchronization across open tabs, but real cross-device hosting and the PHP/MySQL connection remain future deployment work.

## Run the browser demo now

The live localhost demo uses Node.js built-in modules and needs no package installation. Start it from this folder:

```powershell
node server.js
```

Then open `http://127.0.0.1:8766/`. The server opens the sign-in/sign-up screen. New local accounts use salted scrypt password hashes in `auth-users.json`; session cookies last for the running server process. The “Try the demo” button signs in as the synthetic sample user. Shared trip state is stored in `server-data.json` and updates other open tabs using server-sent events. This loopback-only preview is shared between tabs on this computer; it is not hosted on the internet or visible to other devices. Do not use real personal, financial, or photo data in this local prototype.

## PHP and MySQL backend

The backend API uses PHP 8.1+, PDO MySQL, and MySQL 8.0+ (or a compatible MariaDB release). It uses prepared queries, password hashing, session cookies, CSRF tokens for authenticated writes, and trip-membership checks around trip data.

1. Install or start XAMPP and start Apache and MySQL.
2. Copy this app folder under `C:\xampp\htdocs\trip-companion-web-app`.
3. Import `database/schema.sql` in phpMyAdmin or with the MySQL command line.
4. Copy `config.example.php` to `config.php` and set your database account.
5. Open `http://localhost/trip-companion-web-app/` for the browser demo and `http://localhost/trip-companion-web-app/api/index.php?action=csrf` to check API setup.
6. Register your first account through the `register` API action. Promote it to administrator in phpMyAdmin only if you administer this local installation:

```sql
UPDATE users SET is_admin = 1 WHERE email = 'your-admin-email@example.com';
```

Do not publish a database password or production configuration in source control. Change the default XAMPP database setup before exposing this app to a network.

### API actions

Send JSON bodies to `api/index.php?action=ACTION`. Session cookies are same-origin. Fetch a CSRF token from `GET ?action=csrf`, then send it as `X-CSRF-Token` on authenticated write requests.

- `register`, `login`, `logout`, `me`, `csrf`, `profile`
- `trips` (`GET`, `POST`, `PUT`, `DELETE`), `trips&discover=1`, `join`, `requests`, `members`, `invite-code`
- `itinerary`, `chat`, `memories`, `expenses`, `settlements`, `bookings`, `stories`, `reports`, `admin`

The browser demo currently uses its local live-sync API, not the PHP/MySQL API. The PHP API endpoints and schema are included for the planned project backend, but the UI is not connected to them yet. The local account store and in-memory sessions are for localhost preview only. Before deploying for real users, connect the UI to PHP/MySQL, add invitation email delivery, and configure HTTPS and persistent production sessions.

## Feature notes

- The header search suggests matching trips, stories, travelers, bookings, expenses, and public destination entities. Choosing a destination opens its location guide; choosing a trip, story, or saved item opens the matching app page. Destination suggestions require an internet connection.
- Home includes an image-led travel story feed with locally synchronized like and save actions; **Saved stories** keeps a traveler's saved posts.

- New accounts see a guided profile setup after signup: solo/group travel style, traveler and/or tour-guide roles, home currency, languages, interests, and optional guide details. These settings are editable later from **My profile → Edit profile**.
- Trip expense records include payer, participants, equal or custom shares, category, date, note, and an optional image receipt. Shares drive the trip balances and settle-up suggestions; repayments are recorded as history and do not transfer money.
- Equal expense splits use integer minor currency units; any leftover minor units are distributed deterministically. Custom shares must add up exactly.
- Balances are derived from expense shares, payer totals, and recorded settlements. The settle-up feature records that a payment happened; it does not move money.
- Invite codes work locally in the browser demo. Backend invitations are stored as expiring records; outbound email is not configured.
- Trip gallery uploads accept up to five JPG, PNG, or WebP files at a time (up to 8 MB each); larger images are resized in the browser before saving. Expense receipt images are limited to 500 KB. Both are stored in the shared local demo-state file. The PHP schema stores uploaded photo bytes privately in MySQL.
- The reference projects inspired trip matching, requests, companion management, itinerary planning, and travel memories. Their passwords, credentials, and cloud setup were not copied.

## Main files

- `index.html`, `styles.css`, `app.js` — responsive local interactive interface
- `server.js` — loopback web server, shared demo state, and live tab updates
- `api/index.php` — PHP session API
- `config.example.php` — local database settings template
- `database/schema.sql` — MySQL tables for users, tours, members, requests, invites, expenses, shares, settlements, itinerary, chat, memories, and reports

- Trip pages include opt-in browser location sharing. Sharing is off by default, requires browser permission, has a chosen expiry, and can be stopped from the trip screen. Updates require the trip page to remain open; location data is shared through the local live-state preview and is not suitable for a public deployment without per-trip server authorization and retention controls.
- Trip members can add batches of up to five travel photos to a shared gallery, browse album thumbnails from their profile, and open a trip album. Photos stay in this local preview's shared state file; they are not uploaded to Google Photos or a cloud storage service.
- **Explore location** searches destination entities and descriptions through Wikidata, shows related Wikimedia Commons images, and lists nearby lodging places mapped in OpenStreetMap. Selecting **Use my location** asks the browser for permission and requests a driving distance from the public OSRM demo service; if routing is unavailable, the page labels the fallback as straight-line distance. The transport-cost estimate only appears when the traveler enters their own per-kilometer amount. OpenStreetMap does not provide room inventory, hotel rates, or ratings, so the page links to a hotel search for live offers rather than presenting invented availability or prices. Internet access is required; external community endpoints may rate-limit or be unavailable.
- **Plan & book** opens current flight, hotel, and activity searches in external provider pages using the selected origin, destination, dates, traveler count, and room count. A traveler can then record a planned or confirmed reservation in the trip workspace, including dates, price in the trip currency, provider link, and shared notes. This is not a booking engine: reservations, live inventory, final rates, and payments are not fetched or processed in-app. Actual inventory and checkout require credentials and contracts with a travel provider.
- **Travel stories** is a public community feed where users can publish a destination tip, travel story, food find, or guide note with an optional photo. In the localhost preview these stories are saved in the shared demo state. The PHP schema and API also include story records and uploader-only removal; moderation tooling and frontend-to-PHP integration remain deployment work.
- The trip **Bookings** tab stores group-facing reservation notes in the local preview. Do not put card numbers, passwords, or private confirmation secrets in the shared notes. The PHP backend has a matching membership-protected bookings API and table.
- The PHP database schema now includes traveler preference profiles, community stories, and trip booking notes. For an existing database, apply `database/migrations/001_travel_profile_stories_bookings.sql`; for a fresh install, import the updated `database/schema.sql`.
