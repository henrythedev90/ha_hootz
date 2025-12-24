# Ha Hootz - Trivia Game Creator

A Mentimeter/Kahoot-style trivia game application built with Next.js, MongoDB Atlas, Redis, and NextAuth.js.

## Features

### ✅ Host-Created Presentations (MVP)

- **Presentation Management**

  - Create and manage trivia game presentations
  - Add multiple-choice questions (4 options required)
  - Edit and delete questions
  - Save presentations with success modal
  - Delete presentations with confirmation modal
  - Start game sessions from saved presentations

- **Game Sessions**

  - Start live game sessions from presentations
  - 6-digit session codes for easy player joining
  - QR code generation for quick mobile access
  - Redis-powered session management
  - Session status tracking (waiting, live, ended)
  - Real-time game state storage with Socket.io
  - One socket connection per player (automatic reconnection handling)
  - Answer persistence across disconnections
  - Time-based answer submission (can change answers while question is active, locked after expiration)
  - Session cancellation by host

- **Player Experience (Mobile-First)**

  - **Nickname Entry**: Full-screen form for entering player nickname with validation
  - **Lobby/Waiting Room**: Shows waiting message and live player count
  - **Active Question View**:
    - Prominent countdown timer with visual urgency indicators
    - Large, touch-friendly answer buttons stacked vertically
    - Real-time answer selection and updates
    - Automatic answer submission when timer expires
  - **Mobile-Optimized**: Single-column layout, no scrolling during questions, thumb-friendly tap targets
  - **Real-Time Updates**: Instant response to game-started, question-started, and question-ended events
  - **Resilient**: Handles refreshes and reconnects with answer restoration

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

- **Framework**: Next.js 16 (App Router) with custom server
- **Language**: TypeScript
- **Database**: MongoDB Atlas (for persistent data)
- **Cache/Real-time**: Redis (Upstash compatible, serverless-safe)
- **WebSocket**: Socket.io with Redis adapter (multi-server support)
- **Authentication**: NextAuth.js v5
- **Styling**: Tailwind CSS v4
- **Password Hashing**: bcryptjs
- **QR Code Generation**: qrcode (server-side)
- **Server Runtime**: tsx for TypeScript server execution

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

4. Set up Redis (see [REDIS_SETUP.md](./REDIS_SETUP.md) for detailed instructions):

   - Create a Redis instance (Upstash recommended for serverless)
   - Get your Redis connection URL
   - Redis is used for real-time game session management and Socket.io adapter

5. Create a `.env.local` file in the root directory:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=ha-hootz
REDIS_URL=redis://default:<password>@<host>:<port>
NEXTAUTH_SECRET=your_generated_secret_here
NEXTAUTH_URL=http://localhost:3000
```

Generate a secret:

```bash
openssl rand -base64 32
```

6. Run the development server:

```bash
npm run dev
```

**Note**: This project uses a custom server (`server.ts`) to properly integrate Socket.io with Next.js. The server automatically loads environment variables from `.env.local`.

7. Open [http://localhost:3000](http://localhost:3000) in your browser

   - You should see a Redis connection log in your terminal: `✅ Redis configured - URL: redis://...`
   - You should see Socket.io initialization logs: `✅ Socket.io initialized`

### First Steps

1. **Create an Account**: Navigate to `/auth/signup` to create your host profile
   - Use the eye icon to toggle password visibility while typing
   - Both password fields have visibility toggles for convenience
2. **Sign In**: Use your credentials to sign in at `/auth/signin`
   - Password visibility toggle available for easy verification
3. **Create a Presentation**: Click "New Presentation" to start creating your trivia game
4. **Add Questions**: Add multiple-choice questions to your presentation
   - Each question must have exactly 4 answer options
   - At least one option must be marked as correct
   - Questions can be added even before setting a title (saved locally)
   - Questions are automatically saved once the presentation has a title
5. **Save & Manage**:
   - Click "Save Presentation" to persist your work to MongoDB Atlas
   - After saving, choose to go to dashboard, continue editing, or start a game session
   - Delete presentations with confirmation modal for safety
6. **Start Game Sessions**:
   - Click "Start Presentation" button on saved presentations
   - Creates a Redis-backed game session with Socket.io real-time support
   - Receive a 6-digit session code for players to join
   - Share QR code or session code with players
   - Host dashboard shows live player count and session controls
   - Host can start game, start questions, or cancel session
7. **Join as Player**:
   - Navigate to `/join/[sessionCode]` or scan QR code
   - Enter a unique nickname (validated in real-time)
   - Join the lobby and wait for host to start
   - Answer questions with large, touch-friendly buttons
   - See countdown timer and change answers while time is active
   - Answers auto-submit when timer expires

## Project Structure

```
ha-hootz/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts    # NextAuth configuration
│   │   │   └── register/route.ts         # User registration
│   │   ├── presentations/
│   │   │   ├── route.ts                   # GET all, POST new
│   │   │   └── [id]/route.ts              # GET, PUT, DELETE by ID
│   │   ├── sessions/
│   │   │   ├── start/route.ts             # POST - Start game session
│   │   │   ├── by-id/[sessionId]/route.ts # GET, PUT - Manage session by ID
│   │   │   ├── validate/[sessionCode]/route.ts # GET - Validate session code
│   │   │   └── [sessionCode]/check-name/route.ts # POST - Check nickname availability
│   │   ├── qr/[sessionCode]/route.ts      # GET - Generate QR code for session
│   │   ├── socket/route.ts                # Socket.io server status
│   │   └── test-redis/route.ts             # Test Redis connection
│   ├── auth/
│   │   ├── signin/page.tsx                # Sign in page
│   │   └── signup/page.tsx                # Sign up page
│   ├── presentations/
│   │   └── [id]/page.tsx                  # Presentation editor
│   ├── host/[sessionCode]/page.tsx        # Host dashboard for game session
│   ├── join/[sessionCode]/page.tsx        # Player join page (nickname entry)
│   ├── game/[sessionCode]/page.tsx        # Player game view (lobby + questions)
│   ├── page.tsx                           # Dashboard
│   └── layout.tsx                         # Root layout
├── components/
│   ├── PresentationCard.tsx               # Presentation card component
│   ├── QuestionEditor.tsx                 # Question editing form
│   ├── QuestionList.tsx                   # List of questions
│   ├── Modal.tsx                          # Reusable modal component
│   ├── DeleteConfirmationModal.tsx        # Delete confirmation modal
│   ├── Loading.tsx                        # Loading component with animation
│   ├── SessionQRCode.tsx                  # QR code display component
│   └── Providers.tsx                      # Session provider wrapper
├── lib/
│   ├── auth.ts                            # Session helper
│   ├── db.ts                               # Database helpers
│   ├── mongodb.ts                          # MongoDB connection
│   ├── redis/
│   │   ├── client.ts                       # Redis connection (serverless-safe)
│   │   ├── keys.ts                         # Redis key generators
│   │   └── triviaRedis.ts                  # Redis helpers for trivia sessions
│   ├── socket/
│   │   ├── server.ts                       # Socket.io server getter (accesses global instance)
│   │   ├── initSocket.ts                   # Socket.io setup with Redis adapter
│   │   └── handlers/
│   │       ├── host.handlers.ts            # Host event handlers (host-join, START_GAME, START_QUESTION, CANCEL_SESSION)
│   │       └── player.handlers.ts         # Player event handlers (join-session, SUBMIT_ANSWER)
│   ├── types.ts                            # Trivia session types
│   ├── questionConverter.ts                # Question format converters
│   ├── storage.ts                          # API client for presentations
│   └── utils.ts                            # Utility functions (generateId, generateSessionCode, formatDate)
├── server.ts                               # Custom Next.js server with Socket.io integration
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

### Game Sessions

- `POST /api/sessions/start` - Start a game session from a presentation (returns sessionCode)
- `GET /api/sessions/by-id/[sessionId]` - Get session status and details by sessionId
- `PUT /api/sessions/by-id/[sessionId]` - Update session status (waiting, live, ended)
- `GET /api/sessions/validate/[sessionCode]` - Validate a 6-digit session code
- `POST /api/sessions/[sessionCode]/check-name` - Check if a player nickname is available
- `GET /api/qr/[sessionCode]` - Generate QR code for session join URL

### Socket.io Events

**Host Events (Client → Server):**

- `host-join` - Host joins session room (requires `sessionCode`)
- `START_GAME` - Start the game session (requires `sessionCode`)
- `START_QUESTION` - Start a specific question with timer (requires `sessionCode`, `question`, `questionIndex`)
- `CANCEL_SESSION` - Cancel/end the session (requires `sessionCode`)

**Player Events (Client → Server):**

- `join-session` - Join a game session (requires `sessionCode`, `name`)
- `SUBMIT_ANSWER` - Submit or update an answer (requires `gameId`, `questionIndex`, `answer`)

**Server Events (Server → Client):**

**Host Events:**

- `host-joined` - Host successfully joined (includes `sessionCode`, `players`)
- `session-cancelled` - Session was cancelled (includes `sessionCode`)
- `error` - Error occurred (includes `message`)

**Player Events:**

- `joined-session` - Successfully joined session (includes `gameState`, `playerCount`, `playerAnswers`)
- `join-error` - Failed to join (includes `reason`)
- `player-joined` - Another player joined (includes `playerId`, `name`, `playerCount`)
- `player-left` - A player left (includes `playerId`, `name`, `playerCount`)
- `game-started` - Game has started (includes `status`, `questionIndex`)
- `question-started` - New question is active (includes `question`, `questionIndex`, `endAt`)
- `question-ended` - Question time expired
- `session-cancelled` - Host cancelled the session (includes `message`)
- `ANSWER_RECEIVED` - Answer submission result (includes `accepted`, `updated`, `reason`)
- `force-disconnect` - Player has another connection (old socket disconnected)

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

| Variable          | Description                               | Required |
| ----------------- | ----------------------------------------- | -------- |
| `MONGODB_URI`     | MongoDB Atlas connection string           | Yes      |
| `MONGODB_DB_NAME` | Database name (defaults to 'ha-hootz')    | No       |
| `REDIS_URL`       | Redis connection URL (Upstash compatible) | Yes      |
| `NEXTAUTH_SECRET` | Secret for JWT signing                    | Yes      |
| `NEXTAUTH_URL`    | Base URL of your application              | Yes      |

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

- [x] Redis integration for game sessions
- [x] Start game session functionality
- [x] Real-time game sessions (Socket.io integration)
- [x] Player connection management (one socket per player)
- [x] Answer persistence across disconnections
- [x] Time-based answer submission (changeable while active, locked after expiration)
- [x] Player participation UI (join games with codes)
- [x] 6-digit session codes for easy joining
- [x] QR code generation for mobile access
- [x] Game session host view UI
- [x] Game session player view UI (mobile-first)
- [x] Nickname entry with validation
- [x] Lobby/waiting room with player count
- [x] Active question view with countdown timer
- [x] Answer selection with visual feedback
- [x] Session cancellation
- [ ] Live results and leaderboards display
- [ ] Question results view (show correct answer after timer)
- [ ] Image support for questions
- [ ] Presentation sharing and collaboration
- [ ] Game history and analytics
- [ ] Final leaderboard at end of game
