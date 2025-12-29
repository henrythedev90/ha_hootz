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
  - **Scoring Configuration**:
    - Configure base points per question
    - Enable/disable time-based bonuses with max bonus value
    - Enable/disable streak bonuses with customizable thresholds and values
    - Interactive tooltips and modals explaining scoring mechanics
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
  - **Host Dashboard Persistence**: Host stays in session on page refresh, game state automatically restored
  - **Players List Modal**: Shows all joined players with countdown before starting first question
  - **Player Exit Control**: Players who leave cannot rejoin with the same name
  - **Answer Reveal Modal**: Dedicated modal showing correct answer and distribution when host reveals
    - Automatically opens when question ends
    - Shows leaderboard with player scores
    - "Reveal Winner" button on last question
    - "End Game" button after winner is revealed
  - **Real-Time Answer Tracking**: Lightbulb (💡) indicator shows which players have submitted answers
  - **Smart Answer Reveal**: Button only enabled when all connected players have submitted
  - **Timer Control**: Timer automatically stops (set to 0) when answer is revealed
  - **Question Navigation**: Navigate between questions with automatic state reset
    - **Previous Question Review Mode**: When navigating to a previously answered question:
      - Question is displayed in review mode (read-only)
      - Correct answer is automatically revealed
      - Players see their previous answer highlighted
      - Players cannot change their answers in review mode
      - "Start Question" button is disabled for answered questions
      - Question status is set to "QUESTION_ENDED" (no timer, no active submission)
  - **Comprehensive Scoring System**:
    - Configurable base points per question
    - Time-based bonuses (awarded for fast answers)
    - Streak bonuses (awarded for consecutive correct answers)
    - Configurable thresholds and bonus values
    - Score reveal timing options
  - **Leaderboard Display**: Real-time player scores sorted by rank on host dashboard
  - **Winner Display**: Full-screen winner announcement for players at game end
  - **End Game Functionality**: Host can end game with confirmation modal, all players see thank you message
  - **Session Ended Detection**: Players who refresh after game ends see appropriate message instead of game screen

- **Player Experience (Mobile-First)**

  - **Nickname Entry**: Full-screen form for entering player nickname with validation
  - **Lobby/Waiting Room**: Shows welcome message with host name and live player count
  - **Game Welcome Modal**: Displays when game session starts, welcoming player to the active game
  - **Active Question View**:
    - Prominent countdown timer with visual urgency indicators
    - Large, touch-friendly answer buttons stacked vertically
    - Answer buttons only appear when host starts the question
    - Real-time answer selection and updates
    - Automatic answer submission when timer expires
    - Answer reveal with correct answer highlighting
    - Timer stops (set to 0) when answer is revealed
  - **Exit Game**: Players can leave the game with confirmation modal (prevents rejoining with same name)
  - **Winner Display**: Full-screen animated winner announcement showing player rank and full leaderboard
  - **Thank You Modal**: Appears when host ends game, thanking players and encouraging account creation
  - **Session Ended Handling**: Detects when session has ended and shows appropriate message instead of game screen
  - **Mobile-Optimized**: Single-column layout, no scrolling during questions, thumb-friendly tap targets
  - **Real-Time Updates**: Instant response to game-started, question-started, and question-ended events
  - **Resilient**: Handles refreshes and reconnects with answer restoration (can still submit after refresh if question is active)
  - **Automatic Answer Marking**: Players who don't answer when question ends are marked as "NO_ANSWER"
  - **Review Mode**: When host navigates to a previous question:
    - Question is displayed in read-only review mode
    - Correct answer is automatically revealed
    - Player's previous answer is restored and highlighted
    - Answer buttons are disabled (cannot change answers)
    - Question status shows as ended (no timer)

- **User Authentication**

  - Secure user registration and login
  - Password visibility toggle on sign in/sign up
  - User profiles with MongoDB Atlas storage
  - Session management with NextAuth.js

- **Host Dashboard Features**

  - Desktop-first two-column layout (question control on left, live monitoring on right)
  - Real-time player count and answer submission tracking
  - Live answer distribution visualization
  - **Leaderboard Display**: Shows all players with their scores, sorted by rank
  - Question navigation (previous/next) with automatic state reset
    - **Previous Question Review**: Navigating to a previously answered question:
      - Automatically detects if question has been answered
      - Loads answer distribution and player responses
      - Disables "Start Question" button (tooltip explains why)
      - Sets question to review mode for players
  - Answer reveal modal with distribution charts and leaderboard
  - **Reveal Winner**: Button on last question to announce winner to all players
  - **End Game**: Confirmation modal to end game session, disconnects all players
  - Session status checks (prevents access to ended sessions)
  - Real-time stats updates via Socket.io events
  - Visual indicators (💡) showing which players have submitted answers

- **User Experience**
  - Custom loading animations
  - Reusable modal components (Modal, DeleteConfirmationModal, PlayersListModal, GameWelcomeModal, AnswerRevealModal)
  - Reusable layout components (CenteredLayout)
  - Responsive design with dark mode support
  - Intuitive UI with modern styling
  - Accurate countdown timers using timestamp-based calculations

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
│   │   │   ├── [sessionCode]/
│   │   │   │   ├── check-name/route.ts     # POST - Check nickname availability
│   │   │   │   ├── game-state/route.ts     # GET - Get current game state
│   │   │   │   ├── host/route.ts           # GET - Get host name for session
│   │   │   │   ├── players/route.ts        # GET - Get active players list
│   │   │   │   └── stats/route.ts          # GET - Get game statistics
│   │   └── qr/[sessionCode]/route.ts      # GET - Generate QR code for session
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
│   ├── PlayersListModal.tsx               # Modal showing joined players with countdown
│   ├── GameWelcomeModal.tsx               # Welcome modal for players when game starts
│   ├── AnswerRevealModal.tsx              # Modal showing correct answer and distribution
│   ├── WinnerDisplay.tsx                   # Full-screen winner announcement for players
│   ├── ThankYouModal.tsx                  # Thank you modal when host ends game
│   ├── CenteredLayout.tsx                 # Reusable centered layout component
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
│   └── utils.ts                            # Utility functions (generateId, formatDate)
├── server.ts                               # Custom Next.js server with Socket.io integration
└── types/
    ├── index.ts                            # TypeScript types
    └── next-auth.d.ts                      # NextAuth type extensions
```

## Reusable Components

### Modal Components

- **`Modal.tsx`**: Base reusable modal component with customizable size, title, and content
- **`DeleteConfirmationModal.tsx`**: Specialized modal for delete confirmations with customizable messages (supports player mode)
- **`PlayersListModal.tsx`**: Modal showing joined players with countdown timer before starting game
- **`GameWelcomeModal.tsx`**: Welcome modal for players when game session starts
- **`AnswerRevealModal.tsx`**: Modal displaying correct answer, answer distribution, leaderboard, and navigation controls
- **`WinnerDisplay.tsx`**: Full-screen winner announcement component showing player rank and full leaderboard
- **`ThankYouModal.tsx`**: Thank you modal displayed to players when host ends game, encourages account creation
- **`Loading.tsx`**: Loading component with custom animation, supports full-screen or inline modes

### Layout Components

- **`CenteredLayout.tsx`**: Reusable centered layout component with dark mode support, customizable flex direction and positioning

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

// Centered Layout
<CenteredLayout>
  <div>Centered content</div>
</CenteredLayout>

// Centered Layout with relative positioning
<CenteredLayout relative>
  <button className="absolute top-4 right-4">Exit</button>
  <div>Content with positioned elements</div>
</CenteredLayout>
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
- `GET /api/sessions/[sessionCode]/game-state` - Get current game state (for host reconnection)
- `GET /api/sessions/[sessionCode]/host` - Get host name for a session
- `GET /api/sessions/[sessionCode]/players` - Get list of active players in session
- `GET /api/sessions/[sessionCode]/stats` - Get game statistics (player count, answer count, distribution, players with answers)
- `GET /api/sessions/[sessionCode]/player-answer` - Get a player's answer for a specific question (used for review mode)
- `GET /api/qr/[sessionCode]` - Generate QR code for session join URL

### Socket.io Events

**Host Events (Client → Server):**

- `host-join` - Host joins session room (requires `sessionCode`, `userId`)
- `START_GAME` - Start the game session (requires `sessionCode`)
- `START_QUESTION` - Start a specific question with timer (requires `sessionCode`, `question`, `questionIndex`)
- `REVEAL_ANSWER` - Reveal the correct answer (requires `sessionCode`, `questionIndex`)
  - Automatically marks unanswered players as "NO_ANSWER"
  - Calculates and stores scores based on scoring configuration
- `NAVIGATE_QUESTION` - Navigate to a different question (requires `sessionCode`, `questionIndex`)
  - Automatically detects if navigating to a previously answered question
  - Sets question to review mode if it has been answered
  - Includes `isReviewMode`, `answerRevealed`, and `correctAnswer` flags in broadcast
- `END_QUESTION` - End the current question early (requires `sessionCode`, `questionIndex`)
  - Automatically marks unanswered players as "NO_ANSWER"
  - Calculates and stores scores based on scoring configuration
- `REVEAL_WINNER` - Reveal winner to all players (requires `sessionCode`, `leaderboard`)
- `CANCEL_SESSION` - Cancel/end the session (requires `sessionCode`)
  - Updates session status to "ended"
  - Disconnects all player sockets
  - Broadcasts session-cancelled event to all players

**Player Events (Client → Server):**

- `join-session` - Join a game session (requires `sessionCode`, `name`)
- `SUBMIT_ANSWER` - Submit or update an answer (requires `gameId`, `questionIndex`, `answer`)
- `leave-game` - Player explicitly leaves the game (requires `sessionCode`)

**Server Events (Server → Client):**

**Host Events:**

- `host-joined` - Host successfully joined (includes `sessionCode`, `players`, `gameState` for reconnection)
- `game-started` - Game has started (includes `status`, `questionIndex`)
- `question-started` - Question is active (includes `question`, `questionIndex`, `endAt`)
- `question-ended` - Question time expired (includes `questionIndex`)
- `question-navigated` - Question navigation occurred (includes `questionIndex`, `question`, `isReviewMode`, `answerRevealed`, `correctAnswer`)
  - `isReviewMode`: Boolean indicating if question is in review mode (previously answered)
  - `answerRevealed`: Boolean indicating if correct answer should be shown
  - `correctAnswer`: The correct answer option (A, B, C, or D) if in review mode
- `player-joined` - Player joined session (includes `playerId`, `name`, `playerCount`)
- `player-left` - Player left session (includes `playerId`, `playerCount`)
- `answer-stats-updated` - Answer statistics updated (includes `questionIndex`, `answerCount`, `answerDistribution`, `playersWithAnswers`, `playerScores`)
- `session-cancelled` - Session was cancelled (includes `sessionCode`, `message`)
- `error` - Error occurred (includes `message`)

**Player Events:**

- `joined-session` - Successfully joined session (includes `gameState`, `playerCount`, `playerAnswers`)
- `join-error` - Failed to join (includes `reason`)
- `player-joined` - Another player joined (includes `playerId`, `name`, `playerCount`)
- `player-left` - A player left (includes `playerId`, `name`, `playerCount`)
- `game-started` - Game has started (includes `status`, `questionIndex`)
- `question-started` - New question is active (includes `question`, `questionIndex`, `endAt`)
- `question-ended` - Question time expired (includes `questionIndex`)
- `question-navigated` - Question navigation occurred (includes `questionIndex`, `question`, `isReviewMode`, `answerRevealed`, `correctAnswer`)
  - In review mode, players' previous answers are restored and displayed
  - Answer buttons are disabled in review mode
- `answer-revealed` - Correct answer revealed (includes `questionIndex`, `correctAnswer`)
- `winner-revealed` - Winner announced (includes `leaderboard` with player scores)
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
  scoringConfig?: {
    basePoints: number,
    timeBonusEnabled: boolean,
    maxTimeBonus: number,
    streakBonusEnabled: boolean,
    streakThresholds: number[],
    streakBonusValues: number[],
    revealScores: "after-question" | "after-game" | "never"
  },
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
- [x] Host dashboard refresh persistence (game state restoration)
- [x] Players list modal with countdown before game start
- [x] Game welcome modal for players
- [x] Player exit functionality with rejoin prevention
- [x] Host name display in player welcome message
- [x] Answer reveal functionality with dedicated modal
- [x] Question navigation (next/previous) with state reset
- [x] Reusable layout components
- [x] Real-time answer submission tracking with visual indicators (💡)
- [x] Answer reveal button enabled only when all players have submitted
- [x] Timer stops when answer is revealed
- [x] Answer buttons only visible when question is active
- [x] Stats refresh on player reconnection
- [x] Host dashboard access control (prevents access to ended sessions)
- [x] Comprehensive scoring system with base points, time bonuses, and streak bonuses
- [x] Real-time leaderboard display on host dashboard
- [x] Winner display for players at game end
- [x] Thank you modal when host ends game
- [x] Session ended detection for players who refresh
- [x] Automatic marking of unanswered questions as "NO_ANSWER"
- [x] Answer reveal modal automatically opens when question ends
- [x] Reveal winner functionality on last question
- [x] End game functionality with confirmation modal
- [x] Scoring configuration UI with tooltips and explanations
- [ ] Image support for questions
- [ ] Presentation sharing and collaboration
- [ ] Game history and analytics
