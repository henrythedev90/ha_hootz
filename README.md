# Ha Hootz - Trivia Game Creator

A Mentimeter/Kahoot-style trivia game application built with Next.js, MongoDB Atlas, and NextAuth.js.

## Features

### ✅ Host-Created Presentations (MVP)

- **Presentation Management**

  - Create and manage trivia game presentations
  - Add multiple-choice and true/false questions
  - Edit and delete questions
  - Save presentations with success modal
  - Delete presentations with confirmation modal

- **User Authentication**

  - Secure user registration and login
  - Password visibility toggle on sign in/sign up
  - User profiles with MongoDB Atlas storage
  - Session management with NextAuth.js

- **User Experience**
  - Custom loading animations
  - Reusable modal components
  - Responsive design with dark mode support
  - Intuitive UI with modern styling

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB Atlas
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS v4
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (free tier works)
- npm or yarn

### Installation

1. Clone the repository:

```bash
git clone <your-repo-url>
cd ha-hootz
```

2. Install dependencies:

```bash
npm install
```

3. Set up MongoDB Atlas (see [MONGODB_SETUP.md](./MONGODB_SETUP.md) for detailed instructions):

   - Create a MongoDB Atlas account
   - Create a cluster
   - Create a database user
   - Whitelist your IP address
   - Get your connection string

4. Create a `.env.local` file in the root directory:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=ha-hootz
NEXTAUTH_SECRET=your_generated_secret_here
NEXTAUTH_URL=http://localhost:3000
```

Generate a secret:

```bash
openssl rand -base64 32
```

5. Run the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

### First Steps

1. **Create an Account**: Navigate to `/auth/signup` to create your host profile
   - Use the eye icon to toggle password visibility while typing
   - Both password fields have visibility toggles for convenience
2. **Sign In**: Use your credentials to sign in at `/auth/signin`
   - Password visibility toggle available for easy verification
3. **Create a Presentation**: Click "New Presentation" to start creating your trivia game
4. **Add Questions**: Add multiple-choice or true/false questions to your presentation
   - Questions can be added even before setting a title (saved locally)
   - Questions are automatically saved once the presentation has a title
5. **Save & Manage**:
   - Click "Save Presentation" to persist your work to MongoDB Atlas
   - After saving, choose to go to dashboard, continue editing, or start presentation (coming soon)
   - Delete presentations with confirmation modal for safety

## Project Structure

```
ha-hootz/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts    # NextAuth configuration
│   │   │   └── register/route.ts         # User registration
│   │   └── presentations/
│   │       ├── route.ts                   # GET all, POST new
│   │       └── [id]/route.ts              # GET, PUT, DELETE by ID
│   ├── auth/
│   │   ├── signin/page.tsx                # Sign in page
│   │   └── signup/page.tsx                # Sign up page
│   ├── presentations/
│   │   └── [id]/page.tsx                  # Presentation editor
│   ├── page.tsx                           # Dashboard
│   └── layout.tsx                         # Root layout
├── components/
│   ├── PresentationCard.tsx               # Presentation card component
│   ├── QuestionEditor.tsx                 # Question editing form
│   ├── QuestionList.tsx                   # List of questions
│   └── Providers.tsx                      # Session provider wrapper
├── lib/
│   ├── auth.ts                            # Session helper
│   ├── db.ts                               # Database helpers
│   ├── mongodb.ts                          # MongoDB connection
│   ├── storage.ts                          # API client for presentations
│   └── utils.ts                            # Utility functions
└── types/
    ├── index.ts                            # TypeScript types
    └── next-auth.d.ts                      # NextAuth type extensions
```

## Reusable Components

### Modal Components

- **`Modal.tsx`**: Base reusable modal component with customizable size, title, and content
- **`DeleteConfirmationModal.tsx`**: Specialized modal for delete confirmations with customizable messages
- **`Loading.tsx`**: Loading component with custom animation, supports full-screen or inline modes

### Usage Examples

```tsx
// Basic Modal
<Modal isOpen={isOpen} onClose={handleClose} title="My Modal">
  <p>Modal content here</p>
</Modal>

// Delete Confirmation
<DeleteConfirmationModal
  isOpen={isOpen}
  onClose={handleClose}
  onConfirm={handleDelete}
  title="My Presentation"
  itemName="presentation"
  deleting={isDeleting}
/>

// Loading State
<Loading message="Loading presentations..." />
```

## API Routes

### Authentication

- `POST /api/auth/register` - Register a new user
- `GET/POST /api/auth/[...nextauth]` - NextAuth endpoints

### Presentations

- `GET /api/presentations` - Get all presentations for current user
- `POST /api/presentations` - Create a new presentation
- `GET /api/presentations/[id]` - Get a specific presentation
- `PUT /api/presentations/[id]` - Update a presentation
- `DELETE /api/presentations/[id]` - Delete a presentation

## Database Schema

### Users Collection

```typescript
{
  _id: ObjectId,
  email: string,
  password: string (hashed),
  name?: string,
  createdAt: string,
  updatedAt: string
}
```

### Presentations Collection

```typescript
{
  _id: ObjectId,
  userId: string,
  title: string,
  description?: string,
  questions: Question[],
  createdAt: string,
  updatedAt: string
}
```

## Environment Variables

| Variable          | Description                            | Required |
| ----------------- | -------------------------------------- | -------- |
| `MONGODB_URI`     | MongoDB Atlas connection string        | Yes      |
| `MONGODB_DB_NAME` | Database name (defaults to 'ha-hootz') | No       |
| `NEXTAUTH_SECRET` | Secret for JWT signing                 | Yes      |
| `NEXTAUTH_URL`    | Base URL of your application           | Yes      |

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Security Notes

- Passwords are hashed using bcryptjs before storage
- All API routes require authentication
- Users can only access their own presentations
- MongoDB connection uses secure connection strings
- Environment variables should never be committed to version control

## Next Steps / Future Features

- [ ] Player participation (join games with codes)
- [ ] Real-time game sessions
- [ ] Live results and leaderboards
- [ ] Question timers
- [ ] Image support for questions
- [ ] Presentation sharing and collaboration
- [ ] Game history and analytics

## License

MIT
