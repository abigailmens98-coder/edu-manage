# University Basic School - Student Management System

## Overview

This is a comprehensive student and academic management system built for University Basic School (Tarkwa, Ghana). The application provides role-based dashboards for administrators and teachers to manage students, teachers, subjects, academic terms, grade entry, and report generation.

The system follows the Ghana Education Service (GES) curriculum structure with support for KG 1-2 and Basic 1-9 class levels, implementing GES grading scales for academic assessment.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: React Context API for authentication, TanStack React Query for server state
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Build Tool**: Vite

The frontend uses a role-based routing pattern where authenticated users see different interfaces based on their role (admin vs teacher). The `AuthContext` manages session state and provides login/logout functionality.

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (compiled with TSX for development, esbuild for production)
- **Session Management**: express-session with cookie-based authentication
- **Password Hashing**: bcrypt for secure credential storage

The server follows a simple layered architecture:
- `server/index.ts` - Express app setup and middleware configuration
- `server/routes.ts` - API route handlers for all endpoints
- `server/storage.ts` - Data access layer using Drizzle ORM
- `server/seed.ts` - Database seeding with demo data

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema Location**: `shared/schema.ts` (shared between client and server)

Key database tables:
- `users` - Authentication with roles (admin/teacher)
- `students` - Student records with grade levels
- `teachers` - Teacher profiles linked to user accounts
- `subjects` - Curriculum subjects with class level mappings
- `academicYears` / `academicTerms` - Academic calendar management
- `scores` - Student grade records per subject/term

### Authentication
- Session-based authentication using express-session
- Role-based access control (admin and teacher roles)
- Secret word mechanism for password recovery
- Sessions stored server-side with HTTP-only cookies

### API Structure
RESTful API endpoints under `/api/`:
- `/api/auth/*` - Login, logout, session verification
- `/api/students` - CRUD operations for student records
- `/api/teachers` - CRUD operations for teacher records
- `/api/subjects` - Subject management
- `/api/academic-years` and `/api/academic-terms` - Calendar management
- `/api/scores` - Grade entry and retrieval

## External Dependencies

### Database
- **PostgreSQL** - Primary data store, connection via `DATABASE_URL` environment variable

### Key NPM Packages
- **drizzle-orm** / **drizzle-kit** - Database ORM and migration tooling
- **express-session** - Server session management
- **bcrypt** - Password hashing
- **jspdf** / **jspdf-autotable** - PDF report generation (client-side)
- **recharts** - Dashboard charts and visualizations
- **xlsx** - Excel file import/export for student data

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal` - Development error overlay
- `@replit/vite-plugin-cartographer` - Development tooling
- `@replit/vite-plugin-dev-banner` - Development environment indicator

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Optional, defaults to a fallback value for session encryption