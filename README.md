# MailFlow — Email Management System

MailFlow is a professional, complete end-to-end full-stack Email Management System. It pairs a resilient Python/Django REST Framework backend with a modern, responsive React + Tailwind CSS dashboard. MailFlow enables users to read, send, compose, search, tag, star, trash, and synchronize emails with real SMTP/IMAP servers or in an immediate zero-configuration Development/Demo Mode.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Tech Stack](#tech-stack)
5. [Database Design](#database-design)
6. [Project Structure](#project-structure)
7. [REST API Overview](#rest-api-overview)
8. [Installation & Setup](#installation--setup)
   - [Prerequisites](#prerequisites)
   - [Backend Setup](#backend-setup)
   - [Frontend Setup](#frontend-setup)
9. [Environment Variables](#environment-variables)
10. [SMTP & IMAP Configuration](#smtp--imap-configuration)
11. [Seeding Demo Data](#seeding-demo-data)
12. [Running the Application](#running-the-application)
13. [Running Automated Tests](#running-automated-tests)
14. [Docker Deployment](#docker-deployment)
15. [Security & Isolation Notes](#security--isolation-notes)
16. [Future Improvements](#future-improvements)

---

## Project Overview

Modern email management demands responsiveness, resilient background synchronization, and strict multi-tenant data security. MailFlow delivers a clean 3-column productivity dashboard inspired by top-tier modern SaaS applications (Superhuman, Fastmail, Linear).

Every query in MailFlow is strictly scoped to the authenticated user. Even when multiple users share the same database instance, tenant isolation guarantees that User A cannot read, query, update, star, or delete User B's emails, drafts, labels, or attachments.

---

## Key Features

- **JWT Authentication**: Secure user registration, password hashing via Django's PBKDF2 algorithm, token rotation, and automatic token refresh interceptors.
- **3-Column Productivity Layout**:
  - **Sidebar**: Quick navigation for Inbox, Starred, Sent, Drafts, Important, Spam, Trash, and custom colored Labels. Includes dynamic unread/total count badges.
  - **Email List**: Responsive list with multi-selection checkboxes, bulk action bar, star toggles, importance markers, attachment indicators, and backend pagination.
  - **Email Viewer**: Full view with sanitized HTML/plain text rendering, file attachments preview & download, conversation thread history, and quick inline reply.
- **Compose Modal**:
  - Floating and maximizable compose window.
  - Recipient fields (To, CC, BCC) with email syntax validation.
  - Formatting toolbar (Bold, Italic, Bullet Lists, Blockquotes).
  - Multi-file attachments with file-size validation (<10MB) and format support (PDF, DOCX, TXT, PNG, JPG, ZIP).
  - **Autosave Engine**: Debounces user keystrokes to continuously save in-progress messages to Drafts.
  - Auto-inserted email signature based on user preferences.
- **SMTP Sending Service**:
  - Modular Python dispatch service (`backend/emails/services/email_sender.py`).
  - Supports live TLS/SSL SMTP servers (e.g. Gmail App Password, AWS SES, SendGrid).
  - **Development Mode**: When unconfigured or offline, outgoing emails are recorded locally in the database's Sent folder with attachments intact for seamless portfolio demonstrations.
- **IMAP Synchronization**:
  - Secure IMAP engine (`backend/emails/services/email_sync.py`) with duplicate prevention via `Message-ID` and server UID.
  - Thread calculation based on `In-Reply-To` and `References` headers.
  - Frontend "Sync Inbox" button with visual feedback and simulated smart fallback.
- **Labels & Organization**: Create custom color-coded labels, tag emails, and filter views instantly.
- **Advanced Search & Filtering**: Real-time debounced search across subject, sender, recipients, and message body with granular filters (has attachments, starred, important, read/unread, label).
- **Dark Mode / Light Mode**: Seamless theme toggle stored in localStorage and user profile.
- **Multi-Tenant Security Isolation**: Automated test suite explicitly proving User A cannot access User B's data under any circumstance.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 React + Vite Frontend                       │
│  - 3-Column Responsive Dashboard                            │
│  - Axios Client + Auto-Refresh JWT Interceptors             │
│  - Theme Context, Toast Notifications & Auth State          │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / REST / Multipart (JWT Bearer)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Django REST Framework                       │
│  - accounts: Custom User Model, JWT Authentication, Profile │
│  - emails: EmailMessage, Attachments, Drafts, Labels        │
│  - Security: Tenant Isolation QuerySet scoping              │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌─────────────────────────────┐
│      email_sender.py         │ │        email_sync.py        │
│  - SMTP TLS/SSL Dispatch     │ │  - IMAP4_SSL Sync           │
│  - Local Dev Mode Fallback   │ │  - Threading & Deduplication│
└──────────────┬───────────────┘ └─────────────┬───────────────┘
               │                               │
               └───────────────┬───────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Storage Layer                               │
│  - SQLite (Local Development) / PostgreSQL (Production)     │
│  - Media Files (Attachments & Documents)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
- **Python 3.11+**
- **Django 5.1 & Django ORM**
- **Django REST Framework (DRF)**
- **SimpleJWT** (`djangorestframework-simplejwt`)
- **SQLite** (Development) & **PostgreSQL** (Production ready)
- **python-dotenv** & **django-cors-headers**
- **Pillow & BeautifulSoup4**

### Frontend
- **React 18/19 & Vite**
- **Tailwind CSS 3.4**
- **React Router DOM v6/v7**
- **Axios**
- **Lucide React**
- **DOMPurify** (for secure sanitized email rendering)

---

## Database Design

```mermaid
erDiagram
    User ||--o{ EmailMessage : owns
    User ||--o{ Draft : owns
    User ||--o{ Label : owns
    EmailMessage ||--o{ EmailAttachment : contains
    EmailMessage }o--o{ Label : tagged_with

    User {
        int id PK
        string email UK
        string full_name
        string theme_preference
        int emails_per_page
        string default_signature
        string smtp_host
        int smtp_port
        string smtp_username
        string imap_host
        int imap_port
    }

    EmailMessage {
        int id PK
        int owner_id FK
        string message_id
        string thread_id
        string in_reply_to
        string sender_name
        string sender_email
        string recipient_emails
        string cc_emails
        string bcc_emails
        string subject
        text body_text
        text body_html
        string folder
        boolean is_read
        boolean is_starred
        boolean is_important
        boolean is_spam
        boolean is_deleted
        datetime received_at
        datetime sent_at
    }

    EmailAttachment {
        int id PK
        int email_id FK
        string file
        string filename
        string content_type
        int file_size
    }

    Draft {
        int id PK
        int owner_id FK
        string to
        string cc
        string bcc
        string subject
        text body
        string thread_id
        datetime updated_at
    }

    Label {
        int id PK
        int owner_id FK
        string name
        string color
    }
```

---

## Project Structure

```
mailflow/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── .env
│   ├── Dockerfile
│   ├── config/
│   │   ├── settings.py
│   │   ├── urls.py
│   │   ├── wsgi.py
│   │   └── asgi.py
│   ├── accounts/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── admin.py
│   ├── emails/
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── admin.py
│   │   ├── services/
│   │   │   ├── email_sender.py
│   │   │   └── email_sync.py
│   │   ├── management/
│   │   │   └── commands/
│   │   │       └── seed_demo.py
│   │   └── tests/
│   │       ├── test_auth.py
│   │       ├── test_emails.py
│   │       └── test_isolation.py
│   └── media/
│
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/
│       ├── api/
│       │   ├── client.js
│       │   ├── auth.js
│       │   └── emails.js
│       ├── context/
│       │   ├── AuthContext.jsx
│       │   ├── ThemeContext.jsx
│       │   └── ToastContext.jsx
│       ├── components/
│       │   ├── common/
│       │   │   ├── Navbar.jsx
│       │   │   ├── Sidebar.jsx
│       │   │   ├── LoadingSkeleton.jsx
│       │   │   ├── EmptyState.jsx
│       │   │   ├── ConfirmDialog.jsx
│       │   │   └── LabelModal.jsx
│       │   └── email/
│       │       ├── EmailList.jsx
│       │       ├── EmailListItem.jsx
│       │       ├── EmailViewer.jsx
│       │       ├── ComposeModal.jsx
│       │       └── SearchBar.jsx
│       ├── pages/
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── DashboardPage.jsx
│       │   └── SettingsPage.jsx
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## REST API Overview

### Authentication (`/api/auth/`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/auth/register/` | Register user & receive JWT tokens | No |
| `POST` | `/api/auth/login/` | Obtain access & refresh token pair | No |
| `POST` | `/api/auth/token/refresh/` | Refresh expired access token | No |
| `GET` | `/api/auth/me/` | Current user profile | Yes |
| `PUT` | `/api/auth/me/` | Update profile information | Yes |
| `GET` | `/api/auth/settings/` | User settings & masked credentials | Yes |
| `PUT` | `/api/auth/settings/` | Update settings & credentials | Yes |
| `POST` | `/api/auth/change-password/`| Change user password | Yes |

### Emails (`/api/emails/`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/emails/` | List emails (supports `?folder=`, `?page=`, `?label=`) |
| `GET` | `/api/emails/inbox/` | Shortcut for Inbox folder |
| `GET` | `/api/emails/sent/` | Shortcut for Sent folder |
| `GET` | `/api/emails/starred/` | Shortcut for Starred view |
| `GET` | `/api/emails/important/` | Shortcut for Important view |
| `GET` | `/api/emails/spam/` | Shortcut for Spam view |
| `GET` | `/api/emails/trash/` | Shortcut for Trash view |
| `GET` | `/api/emails/counts/` | Badge counts for inbox, starred, drafts, spam, trash |
| `GET` | `/api/emails/{id}/` | Full email detail, attachments, thread replies |
| `POST` | `/api/emails/send/` | Send email via SMTP / Dev Mode with multipart files |
| `POST` | `/api/emails/sync/` | Synchronize inbox via IMAP |
| `DELETE`| `/api/emails/{id}/` | Move to trash or permanently delete if in trash |
| `POST` | `/api/emails/{id}/{action}/` | Actions: `read`, `unread`, `star`, `important`, `archive`, `trash`, `restore`, `spam`, `unspam` |
| `POST` | `/api/emails/bulk/` | Bulk action on list of email IDs |
| `POST` | `/api/emails/empty-trash/` | Permanently deletes all emails in Trash |
| `GET` | `/api/emails/search/` | Search with `?q=`, `?has_attachment=`, `?is_starred=`, etc. |
| `POST` | `/api/emails/{id}/labels/{label_id}/` | Toggle label assignment on an email |

### Drafts (`/api/drafts/`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/drafts/` | List user drafts |
| `POST` | `/api/drafts/` | Save / autosave draft |
| `GET` | `/api/drafts/{id}/` | Retrieve draft detail |
| `PUT` | `/api/drafts/{id}/` | Update draft |
| `DELETE`| `/api/drafts/{id}/` | Delete draft |
| `POST` | `/api/drafts/{id}/send/` | Send draft as live email and delete draft |

### Labels (`/api/labels/`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/labels/` | List custom labels with email counts |
| `POST` | `/api/labels/` | Create custom label (name, color) |
| `PUT` | `/api/labels/{id}/` | Update label |
| `DELETE`| `/api/labels/{id}/` | Delete label |

---

## Installation & Setup

### Prerequisites
- **Python 3.11+** installed
- **Node.js 18+** and **npm** installed
- Git (optional)

---

### Backend Setup

1. Open your terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     python -m venv venv
     .\venv\Scripts\activate
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up your environment file:
   ```bash
   cp .env.example .env
   ```

5. Run database migrations:
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

6. Seed the realistic demo dataset:
   ```bash
   python manage.py seed_demo
   ```

7. Start the Django development server:
   ```bash
   python manage.py runserver
   ```
   The backend API will be running at `http://127.0.0.1:8000/`.

---

### Frontend Setup

1. In a new terminal window, navigate to `frontend/`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend application will be running at `http://localhost:5173/`.

---

## Environment Variables

The backend `.env` file supports the following options:

```ini
# Debug & Security
DEBUG=True
SECRET_KEY=mailflow-dev-secret-key-super-secure-key-2025!@#
ALLOWED_HOSTS=localhost,127.0.0.1,0.0.0.0
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

# Database (leave empty to use default SQLite)
# DATABASE_URL=postgresql://user:password@localhost:5432/mailflow_db

# Email Service Mode
# Set True for zero-credential local demonstration mode
EMAIL_DEV_MODE=True

# Real Outgoing SMTP Credentials (used when EMAIL_DEV_MODE=False)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
EMAIL_USE_TLS=True
EMAIL_USE_SSL=False

# Real Incoming IMAP Credentials
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USER=your-email@gmail.com
IMAP_PASSWORD=your-app-password
IMAP_USE_SSL=True
```

---

## SMTP & IMAP Configuration

MailFlow is architected with a **Provider-Agnostic Service Layer**:
- If `EMAIL_DEV_MODE=True` in `.env`, MailFlow immediately logs and stores dispatched emails in the user's Sent folder with attachments, enabling 100% offline demonstration.
- To connect real email sending with **Gmail**, generate a Google **App Password** (under Google Account Security -> 2-Step Verification -> App Passwords) and place it in `.env` or in the in-app **Settings -> SMTP & IMAP Setup** tab.
- To synchronize incoming messages, provide your IMAP host and credentials. MailFlow will fetch unread messages, parse multipart MIME bodies and attachments, calculate thread relationships, and skip duplicates using `Message-ID` and UID hashing.

---

## Seeding Demo Data

MailFlow includes a built-in management command that generates realistic accounts, conversations, threaded replies, sent items, drafts, spam, and attachments:

```bash
cd backend
python manage.py seed_demo
```

### Pre-configured Demo Login Credentials:
- **Email**: `demo@mailflow.dev`
- **Password**: `MailFlow123!`
- **Tip**: On the login page, you can also click the **"Quick-Fill Demo Credentials"** button for instant one-click login!

---

## Running Automated Tests

MailFlow includes a test suite covering user authentication, JWT handling, email actions, search filters, drafts, and strict tenant security isolation:

```bash
cd backend
python manage.py test emails.tests accounts
```

To run individual test suites:
- **Isolation Security Tests** (verifies User A cannot read, touch, or delete User B's data):
  ```bash
  python manage.py test emails.tests.test_isolation
  ```
- **Email Lifecycle Tests**:
  ```bash
  python manage.py test emails.tests.test_emails
  ```
- **Authentication & JWT Tests**:
  ```bash
  python manage.py test emails.tests.test_auth
  ```

---

## Docker Deployment

To run the entire stack with PostgreSQL, Gunicorn, and Nginx in production mode:

```bash
docker-compose up --build
```

- Frontend & Nginx: `http://localhost:80`
- Django API: `http://localhost:8000/api/`
- PostgreSQL: `localhost:5432`

---

## Security & Isolation Notes

- **Scoped QuerySets**: Every API view enforces `.filter(owner=request.user)`.
- **Credential Masking**: Passwords for custom SMTP/IMAP servers are write-only and never exposed in cleartext across any API responses.
- **Input Sanitization**: Email HTML bodies are sanitized on the frontend using **DOMPurify** before rendering to neutralize XSS attacks.
- **File Upload Protection**: Attachments enforce size boundaries (<10MB) and safe MIME type parsing.
- **Token Rotation**: JWT refresh tokens are rotated and invalidated appropriately.

---

## Future Improvements

- OAuth2 integration with Google Workspace and Microsoft Graph APIs.
- Real-time push notifications using Django Channels and WebSockets.
- Client-side PGP end-to-end encryption for sensitive drafts.
- AI-powered email summarization and automated reply suggestions.
