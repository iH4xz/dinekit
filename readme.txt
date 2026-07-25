=== DineKit ===
Contributors: weblevelup
Tags: restaurant menu, qr menu, food menu, allergen, restaurant
Requires at least: 6.0
Tested up to: 7.0
Requires PHP: 7.4
Stable tag: 1.2.7
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Run your restaurant on WordPress — menus & allergens, online ordering, table bookings and card payments. Commission-free, no monthly fees.

== Description ==

DineKit turns WordPress into a complete, commission-free restaurant platform — menus, online ordering, table bookings and card payments — with nothing to pay per cover, per order or per month. You bring your own Stripe account and keep 100% of every sale.

**Menus & allergens**

* **Menu builder** — menus (Lunch, Dinner, Drinks…), sections and dishes with photos, badges and multiple prices; six templates; drag-and-drop ordering with autosave.
* **UK-14 allergens built in** — the 14 regulated allergens pre-loaded with icons, tooltips and a printable matrix (Natasha's Law friendly), plus your own dietary labels.
* **QR table cards** and A4 posters that open your live menu on a phone, and **Menu / MenuItem / LocalBusiness schema.org** output for SEO.
* **Opening hours** with holiday overrides and a live "open now" status.

**Online ordering**

* **Takeaway, collection and delivery** ordering with a diner-facing menu, dish customizations (removable ingredients, choose-your-options with prices) and an accept / hold / refund workflow that only captures payment when you accept.
* **Contactless QR "order at the table"** so diners order from their phone — straight onto that table's tab, or pay-upfront.
* **Kitchen & bar ticket routing** — printable tickets per station, or emailed directly to a kitchen printer on accept.
* **86 a dish in one tap** — sold-out dishes stay on the menu (SEO-safe) marked unavailable and can't be ordered anywhere.
* **Branded, editable email templates** for order and booking notifications, with a live preview.

**Point of sale — Take Order**

* A real **POS for dine-in service**, in any browser on any tablet — no proprietary hardware, nothing to lease.
* **Tabs with coursing** — build each table's order, fire courses to the kitchen in rounds.
* **Bill splitting** — evenly, by item, or partial payments; service charge and tips.
* **Every tender** — cash with change calculation, card via a Stripe smart reader, pay-by-QR from the guest's phone, vouchers and comps; manager-gated voids.
* **Cash-up** with opening float and X/Z reports at close.
* **Loyalty built in** — members earn points on spend and redeem them as a bill discount.

**Bookings & events**

* **Commission-free table bookings** — a drag-and-drop floor plan with joinable tables, a public booking form (block + `[dinekit_booking]` shortcode) with live availability, waitlist and covers-per-hour pacing, deposits, and a booking diary with email notifications and printable slips.
* **Full-width service timeline** — the whole service at a glance; drag to move a booking, click to seat or edit.
* **Set-menu events with per-guest pre-orders** via a share link — guests choose their courses and flag allergens; the kitchen gets a consolidated prep sheet.

**Payments, guests & staff**

* **Card payments with your own Stripe keys** (encrypted at rest) — booking deposits, order payments and at-the-table card-present payments via Stripe smart readers, with Apple Pay and Google Pay. You keep 100%.
* **Guest CRM** — repeat-visit history with the allergies diners have told you about, carried across every visit.
* **Staff logins** with a role-to-permission matrix and an activity/audit log, plus review-request emails to win diners back.
* **Reports** — covers, revenue, best-selling dishes and no-show rate, with CSV export.
* **Direct support from your dashboard** — message the DineKit team without leaving WordPress (optional; see External Services).

No WooCommerce required and no page builder needed. The menu, allergens and QR codes work with no external accounts; card payments use your own Stripe account (see External Services below). Works with any theme, on any host.

Built by [Web Level Up](https://weblevelup.co.uk/), a UK web agency that builds commercial WordPress software.

== Frequently Asked Questions ==

= Does DineKit need WooCommerce? =
No. DineKit has zero dependencies.

= Is it really free? What's the catch? =
Everything listed above is free — the menus, ordering, bookings, the POS, loyalty, all of it. There is no feature-gating and DineKit never takes a cut of your sales. The only cost that exists anywhere is Stripe's own standard card-processing fee if you enable card payments, and that goes to Stripe, not us.

= Do I need special hardware for the POS? =
No. Take Order runs in any browser on any tablet, laptop or phone. For card-present payments you can add any standard Stripe smart reader (bought outright from Stripe — no leases), and kitchen tickets can print via your browser or be emailed straight to a kitchen printer.

= Does it work with my theme? =
Yes. Menu output is self-contained with its own scoped styles, and works on both block and classic themes.

= How do diners see the menu? =
Add the DineKit Menu block (or the [dinekit_menu] shortcode) to any page. You can also print a QR code for your tables that opens the menu on a phone.

= Can diners order and pay at the table? =
Yes. Print DineKit's QR table cards — diners scan, order from their phone, and their order fires straight to the kitchen on that table's tab (or they pay up front, your choice).

= Who owns my data? =
You do. Everything — menus, bookings, orders, guests — lives in your own WordPress database on your own hosting. There's no external account holding your customer list, and no vendor that can freeze your funds or your data.

= How do I get support? =
Right from your dashboard: DineKit → Support messages our team directly and replies land back in the same screen (and your inbox). Prefer not to? The wordpress.org support forum works too — we watch both.

== External services ==

DineKit's optional payments feature (booking deposits and online order payments) uses **Stripe** to take card payments. Stripe is contacted only after you enable it and enter your own Stripe API keys under DineKit → Integrations, and only on requests that involve a payment:

* When a diner pays, DineKit asks Stripe to create a payment by sending the amount, currency, your site URL and the related booking/order reference to Stripe's API (https://api.stripe.com).
* When you connect Stripe or set up its webhook, DineKit calls Stripe to validate your keys and register payment notifications.
* On pages where a payment can be made, Stripe's official Stripe.js library is loaded from https://js.stripe.com so card details are entered directly with Stripe and never reach your server (PCI SAQ-A).

If you do not enable payments, DineKit makes no external requests. Stripe is a third-party service; by using it you agree to Stripe's terms and privacy policy:

* Terms: https://stripe.com/legal
* Privacy: https://stripe.com/privacy

DineKit's optional **direct support** feature (DineKit → Support) sends your support request to Web Level Up, the makers of DineKit, at https://weblevelup.co.uk. Nothing is sent automatically or in the background — the service is contacted only when a logged-in user opens the Support screen or presses send:

* When you send a request or reply, DineKit transmits the name, email address, subject and message you typed, plus your site address (used to link replies back to your dashboard and keep your ticket history together).
* If — and only if — you tick the "include my site details" box, your WordPress, PHP and DineKit version numbers are attached to help with debugging.
* Opening the Support screen fetches your own site's ticket history from the same service.

If you prefer not to use direct support, the Support screen also links to the plugin's free forum at https://wordpress.org/support/plugin/dinekit/ — using the forum sends nothing to Web Level Up. Web Level Up privacy policy: https://weblevelup.co.uk/privacy-policy/

== Development ==

DineKit is open source (GPLv2+). The complete human-readable source — including the React admin application and the build tooling used to generate the bundled `dist/main.js` — is publicly available and maintained at:

https://github.com/nikutx/dinekit

To build the admin app from source: `npm install` then `npm run build` (Vite). See the repository README for the full development setup.

== Screenshots ==

1. Your menu on any website — sections, prices, dietary filters and UK-14 allergen icons.
2. The Menu Builder — sections and dishes with photos, allergens and multiple prices. Everything autosaves.
3. Design & Preview — six templates plus layout and colour controls, with a live preview and a copy-paste shortcode.
4. Commission-free online ordering for diners — takeaway, collection and delivery, straight from your own site.
5. The live orders board — takeaway, collection and delivery in one place, with kitchen tickets. You keep 100%.
6. The public table-booking form — live availability, party size and deposits, as a block or shortcode.
7. Reports — covers, revenue, no-show rate and your best-selling dishes.
8. Set-menu events with per-guest pre-orders via a share link, and a consolidated kitchen prep sheet.
9. Take Order — the built-in POS: tabs with coursing, fire rounds to the kitchen, split the bill, every tender from cash to smart reader.
10. The drag-and-drop floor plan — zones, joinable tables and covers, driving live booking availability.

== Changelog ==

= 1.2.7 =
* New: a notification bell in the top bar, on every screen, shows what needs your attention right now — orders to accept, bookings to confirm, your waitlist and pending holiday requests — and each one is a single click straight to where you deal with it. It only shows things you have permission to action.

= 1.2.6 =
* Support conversations now open at the newest message, so you don't have to scroll to see the latest reply.
* Long support threads stay light — only the most recent messages load, with a "Show earlier messages" button for the rest.
* Emoji in support messages now display correctly.

= 1.2.5 =
* Fix: replies from the support team now appear in your Support screen straight away. On some hosts a cache could hold an older copy of the conversation, so a reply looked like it hadn't arrived — support replies are now always fetched fresh.

= 1.2.4 =
* New: Support — message the DineKit team straight from your dashboard. No account or key needed: type your name, email and question; replies land back in the same screen (and your inbox). Track all your requests, reply, and mark them solved without leaving WordPress. Optional — the wordpress.org forum works too, and nothing is ever sent in the background.
* New: a "Common fixes" panel on the Support screen answers the most frequent questions (QR 404s, missing emails, Stripe test mode…) in under a minute, before you even need to ask.
* New: after your first accepted order or confirmed booking, DineKit asks (once, politely) whether you'd leave a review — fully dismissible, and "no thanks" means never again.
* Housekeeping: the review-request schedule is now cleaned up when the plugin is deactivated or uninstalled.

= 1.2.3 =
* Floor plan: deleting a zone now asks first and lets you move its tables to another zone (or remove them) — and if any of those tables have upcoming bookings, you can reassign each one to a free table before it goes.
* Nothing is lost: deleted zones and tables now live in a new "History" tab on the floor plan, restorable with one click.
* Joined tables are colour-matched on the plan so you can see your table groupings at a glance; a table shared by two joins blends both colours.
* Tables show a small orientation marker, so you can tell which way one faces after rotating it.
* Fixes: the "Out of service" toggle now responds wherever you click it; moving a table to another zone updates the plan straight away; the rotate button lines up with the zone selector; and the min/max party boxes are tidier.

= 1.2.2 =
* Smoother onboarding: the setup wizard now walks you through your opening hours, and you can skip ahead and pick up the rest from your dashboard whenever you like.
* Menu, ordering and booking pages are created as drafts for you to review and publish — with a clear "review & publish" prompt, and a checklist that only ticks a page off once it's actually live.
* Dishes are never lost: removing a dish now archives it (kept for your past orders and reports) and you can restore it any time — with a heads-up if it's on an order the kitchen is cooking right now.
* Online ordering follows your opening hours: orders are only taken while you're open, with an optional "last orders" cut-off before closing time.
* Table bookings read your opening hours directly, so your service times live in one place.
* Polish: tidier fields inside pop-out panels, your cursor stays put while typing, and assorted small performance improvements.

= 1.2.1 =
* Release-pipeline fix only — no plugin changes. Superseded by 1.2.2, which carries this line's content.

= 1.2.0 =
* Release-pipeline fix only — no plugin changes. Superseded by 1.2.2, which carries this line's content.

= 1.1.0 =
* Commission-free online ordering — takeaway, collection and delivery, with a diner-facing menu, dish customizations, and printable kitchen/bar tickets.
* Contactless QR "order at the table".
* Commission-free table bookings: drag-and-drop floor plan with joinable tables, a public booking form (block + [dinekit_booking] shortcode) with live availability, waitlist, covers-per-hour pacing and deposits.
* Booking diary with statuses, email notifications, and printable reservation slips.
* Set-menu events with per-guest pre-orders via a share link — guests choose their courses and flag allergens; the kitchen gets a consolidated prep sheet you can print.
* Card payments with your own Stripe keys (encrypted at rest) — booking deposits and order payments, Apple Pay and Google Pay. You keep 100%.
* Guest CRM: repeat diners with the allergies they've told you about, carried across every visit.
* Staff logins with a role-to-permission matrix and an activity/audit log; review-request emails to win diners back.
* Dynamic dish customizations (removable ingredients + choose-your-options with prices), six menu templates and colour theming.

= 1.0.0 =
* First public release.
* Menu builder with menus, sections and items — photos, badges and multiple prices per item, drag-and-drop ordering, inline editing with autosave.
* UK-14 regulated allergens pre-loaded with icons, tooltips and a printable allergen matrix (Natasha's Law friendly).
* Dietary labels (vegan, vegetarian, gluten free, halal, spicy — and your own).
* DineKit Menu block and [dinekit_menu] shortcode with three layouts (list, card grid, chalkboard) and 1–4 column options.
* Design & Preview screen to choose a style and copy the shortcode.
* Print-ready QR table cards and A4 posters that open your menu on a phone.
* Opening hours with holiday overrides and a live open/closed status.
* Menu, MenuItem and LocalBusiness schema.org output for SEO.
* Works with block and classic themes. No dependencies.
