# Feature Audit: Exercise.com vs Carbon Gym

## Data Status

### ✅ Exported from Exercise.com API (rich data)
| Data | Count | Key fields |
|------|-------|------------|
| Clients | 774 | name, email, phone, billing, tags, nutrition goals, Stripe data |
| Exercises | 795 | name, video URLs (287), thumbnails, descriptions, equipment, tags |
| Products/Packages | 127 | name, price, description, payment options |
| Messages | 471 | sender, body, timestamps |
| Conversations | 85 | participants, metadata |
| Trainers | 9 | name, email, role |
| Assessments | 25 | name, questions/fields |
| Resources | 7 | name, file URLs |
| Groups | 6 | name, description |

### ❌ Not in API — must scrape from UI or recreate manually
| Data | Notes |
|------|-------|
| Visits/Appointments | Calendar/schedule history — need DOM scrape |
| Recurring Members | Recurring booking configs — need DOM scrape |
| Workout Plans + Routines | Plan structure with exercises/sets/reps — need DOM scrape |
| Workout Logs | Client completed workouts — need DOM scrape |
| Measurements | Body metrics per client — need DOM scrape |
| Trainer Notes | Per-client private notes — need DOM scrape |
| Availability Schedules | Per-staff availability — need DOM scrape |
| Automation Rules | Trigger/action workflows — captured as text |
| Services | Appointment types — 10 seeded from UI observation |
| Payment History | Only active billing via client.next_payment |

---

## Feature Parity Checklist

### Dashboard
- [ ] KPI cards pull from real DB (new accounts, failed payments, expiring packages, etc.)
- [ ] Date range filter actually filters data
- [ ] Compare To period selector
- [ ] Breakdown panel with real aggregations

### Clients/Accounts
- [ ] List: real data from tRPC ✅ (wired)
- [ ] List: filter by Status, Lifecycle Stage, Tags, Assigned To, Group, Custom Status, Workout Plan, Custom Profile Field, App Platform
- [ ] List: saved filter views (heart icon)
- [ ] List: bulk actions (select multiple → bulk email, tag, assign)
- [ ] Detail: Personal Info — edit and save ✅ (UI built, needs tRPC mutation)
- [ ] Detail: Packages — show assigned packages, assign new
- [ ] Detail: Payments/Products — payment history, charge account
- [ ] Detail: Measurements — CRUD, chart trends
- [ ] Detail: Private Trainer Notes — CRUD ✅ (UI built)
- [ ] Detail: Workouts — assigned plans, workout log viewer
- [ ] Detail: Nutrition — assigned plans, macro tracking
- [ ] Detail: Assessments — view completed, assign new
- [ ] Detail: Resources — view assigned, assign new
- [ ] Detail: Videos — exercise video library per client
- [ ] Detail: Group Memberships — add/remove from groups
- [ ] Detail: Visits — visit history with status
- [ ] Charge Account button — Stripe checkout
- [ ] Manage Tags — inline tag management
- [ ] Archive/Restore client

### Schedule/Calendar
- [ ] Multi-staff day view ✅ (UI built with mock data)
- [ ] Week view
- [ ] Click to book appointment (modal) ✅ (UI built)
- [ ] Drag to reschedule
- [ ] Click appointment → detail popover with edit/cancel
- [ ] Filter by Location, Service, Service Category, Booked Asset, Staff, Staff Tags
- [ ] Show Cancelled toggle
- [ ] Hide Availability toggle
- [ ] Color-coding by service type
- [ ] Availability overlay (gray bars for available slots)

### Schedule/Visits
- [ ] Full visit table with real data
- [ ] Filter: Session Visits, Visit Status, Paid Status, Staff Member, Location, Service, Membership ID, Account Package ID, Lifecycle Stage, Date
- [ ] Change visit status (Reserved → Confirmed → Completed / Cancel)
- [ ] Link visit to package (decrement sessions)

### Schedule/Recurring Members
- [ ] List all recurring booking configs
- [ ] Create/edit recurring booking
- [ ] Auto-generate appointments from recurring rules

### Schedule/Services
- [ ] CRUD services ✅ (list built)
- [ ] Service categories management
- [ ] Set duration, type (appointment/class), max participants, color
- [ ] Link to location

### Schedule/Packages
- [ ] CRUD packages ✅ (list built)
- [ ] Set price, billing cycle, session count, expiry
- [ ] Link to Stripe Price
- [ ] Auto-renew toggle

### Schedule/Locations
- [ ] CRUD locations ✅ (card built)

### Schedule/Availability
- [ ] Per-staff availability schedules ✅ (display built)
- [ ] Edit day/time slots
- [ ] Link available slots to specific services

### Exercises
- [ ] List with real data from DB
- [ ] Filter: Muscle Group, Difficulty Level, Force Type, Tags, Created By, Has Video, Active
- [ ] Create exercise with all fields ✅ (modal built)
- [ ] Video upload to Supabase Storage
- [ ] Video playback in exercise detail
- [ ] Exercise detail page with instructions, similar exercises
- [ ] Bulk import/export
- [ ] Deactivate/reactivate exercise

### Plans
- [ ] List with real data from DB ✅ (list built)
- [ ] Plan builder — add weeks, add days, add exercises per day
- [ ] Exercise picker within plan builder (search exercise library)
- [ ] Set sets/reps/weight/rest/tempo/notes per exercise
- [ ] Drag-and-drop reorder exercises within a day
- [ ] Duplicate plan
- [ ] Assign plan to client(s)
- [ ] Plan status workflow: Draft → Published → Assigned → Archived
- [ ] Manage Routines page

### Groups
- [ ] List with real data ✅ (list built)
- [ ] View group members
- [ ] Add/remove members
- [ ] Group messaging (send message to entire group)
- [ ] Create/edit/delete group

### Messages
- [ ] Thread list with real conversations from DB ✅ (UI built)
- [ ] Send/receive messages (tRPC mutation)
- [ ] Real-time updates (Supabase Realtime)
- [ ] File attachments (Supabase Storage)
- [ ] Scheduled messages
- [ ] Group messages
- [ ] Unread count badge
- [ ] New conversation modal

### Automations
- [ ] Display rules ✅ (UI built)
- [ ] Create new automation (When/Who/What builder)
- [ ] Edit existing rules inline
- [ ] Trigger types: days after purchase, days after signup, days before expiry, on first login
- [ ] Action types: assign staff, import plan, assign resource, send message, add to group, add tag
- [ ] Enable/disable toggle
- [ ] Cron engine to evaluate and execute rules

### Settings/Account
- [ ] Business Information — edit ✅ (display built)
- [ ] Personal Information — edit profile
- [ ] Staff Members — list ✅, invite new, edit roles, deactivate
- [ ] Billing/Stripe — connect account, view billing
- [ ] Customize Platform — branding, colors
- [ ] Connected Apps — integrations
- [ ] Products — product/package management
- [ ] Assessments — assessment builder
- [ ] Resources — file management
- [ ] Videos — video library
- [ ] Stripe — payment settings
- [ ] Reports — revenue, activity, utilization
- [ ] Tags — manage tags
- [ ] Measurement Reports
- [ ] Links, Events, Support, Time Card, Lifecycle, Emails, Point of Sale

### Client Portal (Mobile)
- [ ] Home dashboard ✅ (UI built)
- [ ] View/log workouts ✅ (UI built)
- [ ] Book/view appointments ✅ (UI built)
- [ ] Messages with trainer ✅ (UI built)
- [ ] Profile ✅ (UI built)
- [ ] All above need real data + mutations
- [ ] Push notifications
- [ ] PWA install
