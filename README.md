# TalentTrack 3.0: Cloud-Connected Job Portal & Applicant Tracking System

TalentTrack 3.0 is a responsive web application designed for job discovery, opportunity posting, and application management[cite: 8]. Transitioned from isolated client-side storage to a decoupled client-server architecture, version 3.0 communicates with cloud REST endpoints on MockAPI.io to execute asynchronous CRUD (Create, Read, Update, Delete) operations via native JavaScript fetch() calls.

---

## Key Features

- Live Cloud Persistence: All job listings and submitted applications persist directly to a remote MockAPI cloud database.
- Complete CRUD Operations:
  - Create (C): Add open positions via POST /jobs and submit candidate applications via POST /applications.
  - Read (R): Retrieve live job openings via GET /jobs and candidate history via GET /applications.
  - Update (U): Update candidate profiles dynamically with synchronized session states.
  - Delete (D): Withdraw submitted applications in real time using DELETE /applications/:id, decrementing application counters and resetting the job card status back to "Apply Now".
- Dynamic Search & Filtering: Filter listings by categories (Full-Time, Remote, Part-Time) or perform instantaneous text searches across titles and companies.
- Offline Resilience: Implements try...catch fallback handling to retain cached data in localStorage if API limits or network issues occur.
- Responsive UI & Themes: Styled with modern CSS variables featuring dark/light theme switching, skeleton loaders, and animated resume drop areas.
- Client-Side Form Validations: Strict regular expression checks for 10-digit mobile numbers, alphabetic names, and @gmail.com email addresses.

---

## Tech Stack

- Frontend: HTML5, CSS3 (CSS Variables, Flexbox, Grid), JavaScript (ES6+, Async/Await, Fetch API)[cite: 8]
- Cloud Backend: MockAPI.io RESTful service
- Version Control & Hosting: Git, GitHub Desktop, GitHub Pages

---

## Cloud REST API Specification

Base URL:
https://6aba8d5c5b549d818d627f0d.mockapi.io

### 1. Job Listings Endpoint
- Endpoint: /jobs
- Method: GET
- CRUD Type: Read
- Action: Retrieves all available job listings.

- Endpoint: /jobs
- Method: POST
- CRUD Type: Create
- Action: Posts a new job listing to the remote database.

### 2. Candidate Applications Endpoint
- Endpoint: /applications
- Method: GET
- CRUD Type: Read
- Action: Retrieves all submitted candidate applications.

- Endpoint: /applications
- Method: POST
- CRUD Type: Create
- Action: Submits a new job application referencing jobId.

- Endpoint: /applications/:id
- Method: DELETE
- CRUD Type: Delete
- Action: Deletes an application record by its unique resource ID.

---

## Project Structure

```text
TalentTrack-3.0/
├── index.html        # Semantic HTML layout, modals, and dynamic containers
├── styles.css        # Responsive stylesheets, dark/light themes, and skeleton loaders
├── script.js         # Cloud REST API integration, CRUD methods, and DOM logic
└── README.md         # Project documentation