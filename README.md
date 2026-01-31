# Ha Hootz - Trivia Game Creator

A Mentimeter/Kahoot-style trivia game application built with Next.js 16, TypeScript, MongoDB Atlas, Redis, Socket.io, Redux Toolkit, NextAuth.js v5, and Tailwind CSS v4.

## Version 1.0 - Deployment Ready 🚀

**Release Date**: January 2026

Version 1.0 represents the first production-ready release of Ha-Hootz, with comprehensive deployment readiness improvements across the entire application.

### 🎯 Deployment Readiness Improvements

#### Socket.io Connection Architecture

- **Optimized Connection Method**: Changed from `io(socketUrl)` to `io({ path: "/api/socket" })` for same-origin connections, following Socket.io best practices
- **SSR Safety**: Added `typeof window === "undefined"` checks to prevent server-side socket creation
- **Enhanced Error Handling**:
  - Specific error messages for CORS, timeout, and 400 errors
  - Detailed error logging with error type and message
  - User-friendly error messages for different failure scenarios
- **Connection Reliability**:
  - Added 20-second connection timeout
  - Improved cleanup on component unmount with `removeAllListeners()`
  - Connection state verification before emitting events
  - 100ms delay before emitting `join-session` to ensure connection is fully established
- **Server-Side Improvements**:
  - Enhanced CORS configuration with dynamic origin validation
  - Comprehensive connection logging (origin, user-agent, connection errors)
  - Better error context logging for debugging

#### Memory Leak Prevention

- **Timeout Cleanup**: All `setTimeout` calls now have proper cleanup:
  - `copiedTimeoutRef` for copy link feedback
  - `modalToggleTimeoutRef` for modal state toggles
  - `redirectTimeoutRef` for session redirects
  - Pulse animation timeouts in LobbyView
- **Interval Cleanup**: All `setInterval` calls properly cleared on unmount
- **Socket Cleanup**: Complete socket cleanup with `removeAllListeners()` and `disconnect()`
- **Effect Cleanup**: All useEffect hooks have proper cleanup functions

#### Array & Type Safety

- **Defensive Programming**: All array operations validate input:
  - `Array.isArray()` checks before calling array methods
  - Safe defaults for empty arrays (`[]`)
  - Optional chaining for array access (`array[0]?.property`)
- **Type Validation**:
  - Type checks for `playerCount`, `playerScores`, `streakThresholds`
  - Safe defaults for all object properties
  - Type guards for number/string/object types
- **Null/Undefined Handling**: Comprehensive null checks throughout:
  - Leaderboard validation in WinnerDisplay and LeaderboardModal
  - Players array validation in host dashboard
  - Stats object validation with safe defaults

#### SSR Compatibility

- **Portal Safety**: GameModals portal checks for `document.body` existence
- **Window Checks**: All `window` and `navigator` usage wrapped in existence checks
- **Client-Only Operations**: Socket connections, clipboard operations, and DOM manipulations only run on client

#### Error Handling Enhancements

- **Clipboard API**:
  - Try-catch for `navigator.clipboard.writeText()`
  - Fallback to `document.execCommand("copy")` for older browsers
  - Availability checks before use
- **QR Code Fetching**:
  - Response status checking
  - `isMounted` flag to prevent state updates after unmount
  - Graceful fallback when QR code fails to load
- **Image Loading**: Error handlers for avatar images with graceful fallback

#### Performance Optimizations

- **ConfettiEffect**: Limited animation repeats from `Infinity` to `1` to prevent performance issues
- **Production Logging**: All debug `console.log` statements wrapped in `process.env.NODE_ENV === "development"` checks
- **Memoization**: Leaderboard calculations memoized to prevent expensive re-sorts

#### Component-Specific Fixes

**LobbyView Component**:

- Memory leak fix: setTimeout cleanup for pulse animation
- QR code fetch: Improved error handling with `isMounted` flag
- SSR safety: Safe `previousPlayerCount` initialization
- Image error handling: Graceful fallback for avatar images
- Type safety: Player count validation

**WinnerDisplay Component**:

- Array safety: `safeLeaderboard` validation
- Type safety: `playerId` and `playerName` validation
- Optional chaining: Safe array access throughout
- Production logging: Debug logs only in development

**LeaderboardModal Component**:

- Array safety: Players and `playerScores` validation in `useMemo`
- Type safety: Streak value type checking
- Memoization: Leaderboard calculation memoized
- Production logging: Debug logs only in development

**GameModals Component**:

- SSR safety: Portal container existence check
- Array safety: Leaderboard validation before passing to WinnerDisplay

**Host Dashboard**:

- Memory leak fixes: All timeouts properly cleaned up
- Clipboard API: Error handling with fallback
- Array safety: Players, questions, and stats validation
- Type safety: All props validated before use

### 📋 Deployment Checklist

All components now meet production standards:

- ✅ No memory leaks (all timers cleaned up)
- ✅ SSR compatible (no server-side errors)
- ✅ Type safe (comprehensive type checking)
- ✅ Error resilient (graceful error handling)
- ✅ Performance optimized (limited animations, memoization)
- ✅ Production ready (no debug logs in production)

### 🔧 Technical Improvements

- **Socket.io**: Production-ready connection configuration
- **Error Handling**: Comprehensive error handling throughout
- **Memory Management**: Zero memory leaks
- **Type Safety**: Full TypeScript type checking
- **SSR Support**: Complete server-side rendering compatibility
- **Performance**: Optimized animations and calculations

### 📦 Files Modified

- `app/game/[sessionCode]/page.tsx` - Socket.io client, error handling
- `app/host/[sessionCode]/page.tsx` - Memory leaks, array safety, error handling
- `components/LobbyView.tsx` - Memory leaks, error handling, SSR safety
- `components/WinnerDisplay.tsx` - Array safety, type safety
- `components/LeaderboardModal.tsx` - Array safety, type safety, memoization
- `components/GameModals.tsx` - SSR safety, array safety
- `components/ConfettiEffect.tsx` - Performance optimization
- `server.ts` - Enhanced logging, CORS improvements

### 🚀 Ready for Production

Version 1.0 is fully tested and ready for deployment to production environments including:

- Fly.io (primary deployment target)
- Any Node.js hosting platform
- Docker containers
- Cloud platforms (AWS, GCP, Azure)

---

## Deployment & Production (Implemented)

The following deployment and production features are implemented and documented.

### Fly.io Deployment

- **App**: Deployed as `ha-hootz` on Fly.io (region `iad`); single process runs custom server (`npx tsx server.ts`).
- **Build**: Dockerfile (Node 20 Alpine, multi-stage); health check at `/api/health`.
- **Secrets**: All config via Fly secrets (MONGODB_URI, REDIS_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, APP_URL, RESEND_API_KEY, RESEND_FROM_EMAIL).
- **Redeploy**: From app directory run `fly deploy`; no worker process required for email.

See `ha-hootz/DEPLOY_NOW.md` for step-by-step deploy and `ha-hootz/DEPLOYMENT.md` for full Fly.io guide.

### Custom Domain (www.ha-hootz.com)

- **Domain**: www.ha-hootz.com and ha-hootz.com attached to the Fly app; TLS certificates via Fly.
- **DNS**: Squarespace DNS — A records for traffic to Fly IPv4; TXT records for ACME DNS-01 when certs are “Awaiting configuration.”
- **App URL**: NEXTAUTH_URL and APP_URL set to `https://www.ha-hootz.com` so auth, email links, and QR codes use the production URL.
- **CORS**: Socket.io allows NEXTAUTH_URL plus optional ADDITIONAL_ORIGINS (e.g. ha-hootz.fly.dev, ha-hootz.com).

See `ha-hootz/CUSTOM_DOMAIN.md` for DNS records, TLS troubleshooting, and verification checklist.

### Resend Email (Production)

- **Sending**: Verification and password-reset emails sent from the app via Resend API (`lib/send-email-resend.ts`); no separate email worker required on Fly.io.
- **From address**: `noreply@ha-hootz.com`; requires ha-hootz.com verified in [Resend → Domains](https://resend.com/domains) with DKIM, SPF, and MX records added in Squarespace.
- **Debug**: `GET /api/debug/resend` returns safe config (resendApiKeySet, fromEmail, baseUrlForLinks); Fly logs show `[Resend] Sending ...`, `[Resend] OK sent ...`, or `[Resend] API ERROR: ...` for troubleshooting.
- **Docs**: `ha-hootz/docs/RESEND_TROUBLESHOOTING.md`, `ha-hootz/docs/RESEND_DNS_SQUARESPACE.md` for DNS setup and Resend issues.

### Key Files for Deployment & Email

| Purpose | File / Path |
|--------|-------------|
| Fly config | `ha-hootz/fly.toml` |
| Docker build | `ha-hootz/Dockerfile` |
| Deploy helper | `ha-hootz/deploy.sh` |
| Resend sender | `ha-hootz/lib/send-email-resend.ts` |
| Email templates | `ha-hootz/lib/email-templates.ts` |
| Debug Resend | `GET /api/debug/resend` |
| Custom domain docs | `ha-hootz/CUSTOM_DOMAIN.md` |
| Resend DNS (Squarespace) | `ha-hootz/docs/RESEND_DNS_SQUARESPACE.md` |

---

## Recent Updates

#### Test Coverage Improvements

- **Enhanced Jest Test Coverage**: Significantly improved test coverage for high-value game logic areas:
  - **Scoring Calculations** (`lib/scoring/calculateScore.test.ts`): Added comprehensive tests for:
    - Time bonus calculations with various configurations
    - Streak bonus calculations with different thresholds
    - Combined bonus scenarios (time + streak)
    - Edge cases and boundary values
    - Score calculation with disabled bonuses
  - **Redis Operations** (`lib/redis/triviaRedis.test.ts`): Added tests for:
    - Player streak management (`getPlayerStreak`, `updatePlayerStreak`)
    - Answer timestamp tracking (`storeAnswerTimestamp`, `getAnswerTimestamp`)
    - Score calculations (`calculatePlayerScore`, `calculateQuestionScores`)
  - **Socket Handlers** (`lib/socket/handlers/player.handlers.test.ts`): Added tests for:
    - Answer submission and validation
    - Answer change handling
    - Expiration logic
    - Error handling for invalid submissions
  - **Redis Mock Extensions**: Extended `__mocks__/redis.ts` to support additional Redis operations:
    - `hExists`, `hSetNX`, `zRangeWithScores`
    - `sAdd`, `sRem`, `sMembers` (set operations)
    - `exists`, `expire` (key management)

#### Mobile UI Optimizations

- **Game Page Mobile Optimization** (`app/game/[sessionCode]/page.tsx`):
  - Fine-tuned sizing after initial reduction for optimal mobile experience:
  - Slightly increased padding, font sizes, and spacing
  - Improved readability while maintaining mobile fit
  - Better balance between compactness and usability
  - **Sticky Timer Implementation**:
    - Timer now sticks to the top of the viewport with `sticky top-0` positioning
    - Added backdrop blur effect for better visibility
    - Timer remains visible during scrolling, ensuring players always see time remaining
    - Added 40px top padding to timer container for proper spacing
  - **Conditional Padding**:
    - Player name section padding adjusts based on game state:
      - No padding when timer is active (to prevent excessive spacing)
      - No padding when result messages are displayed
      - Padding applied only when appropriate for optimal layout

#### Hydration Error Fixes

- **Fixed React Hydration Mismatches**:
  - **SessionStorage Access**: Moved `sessionStorage` access from `useState` initializer to `useEffect` to prevent SSR/client mismatches
    - Avatar data now loaded client-side only after component mount
    - Prevents hydration errors from server/client state differences
  - **Date.now() Usage**: Fixed timer percentage calculation to use `timeRemaining` state instead of `Date.now()`
    - Eliminates hydration mismatches from server/client time differences
    - Timer percentage now calculated from Redux state (`timeRemaining`) which is updated via `useEffect`
    - Ensures consistent values between server and client renders

### UI/UX Enhancements

- **Loading Component**: Completely redesigned with 5 animation variants (dots, pulse, bars, orbit, wave) and 3 size options (small, medium, large). Features smooth Framer Motion animations with app-themed colors. Reusable across the application for consistent loading states. Supports both full-screen and inline modes. Used throughout the application:
  - Players list modal shows animated loading when fetching players
  - Game page shows pulse animation when waiting for host to start question
  - Game in progress state displays animated loading indicator

- **Game Welcome Modal**: Enhanced with smooth Framer Motion entrance animations using spring physics, countdown timer (auto-closes after 5 seconds), and improved visual design matching app theme. Features:
  - Staggered content reveals with spring animations
  - Animated CheckCircle icon from lucide-react
  - Countdown display showing "Closing automatically in X seconds"
  - Dark background with indigo color scheme
  - Improved button effects and hover states

- **Thank You Modal**: Redesigned with modern Framer Motion animations, gradient call-to-action card, and improved visual hierarchy. Features:
  - Staggered entrance animations with spring physics
  - Animated celebration emoji with rotation effects
  - ArrowRight and X icons from lucide-react
  - Optional close button in top-right corner
  - "Maybe later" button for skipping account creation
  - Smooth transitions and improved button effects

- **Lobby View**: Complete redesign with improved layout and organization:
  - Single viewport, compact layout optimized for presentation-ready styling
  - Two-column grid layout with vertical divider between sections
  - Left column: Player preview with scrollable list
  - Right column: Session info (QR code, session code, settings)
  - Players list with bordered container (2px solid indigo border, 24px border-radius)
  - Randomized colors and glow effects for player avatars
  - Player avatars displayed with initials fallback
  - Streak indicators (🔥) shown when players achieve streak thresholds
  - Compact header with border-bottom and connection status indicator
  - Copy Link section in dedicated card with 3:1 flex ratio layout
  - QR Code section with centered display
  - Randomize Answer Choices toggle integrated into QR card
  - Players list with header, scrollable content area, and footer
  - Bottom action bar with border-top for Start Game and Cancel Session buttons
  - All content fits on screen without scrolling
  - Responsive padding and spacing throughout

- **Presentation Editor**: Made fully responsive for mobile devices:
  - Grid layout stacks on mobile (1 column) and expands on desktop (4 columns)
  - Questions section stacks vertically on mobile, horizontally on desktop
  - Responsive padding adjustments for all screen sizes
  - Desktop layout remains unchanged (lg: breakpoints)

- **Question Navigation Sidebar**: Enhanced with multiple improvements:
  - Sticky "Question Bank" heading that stays in place on scroll with backdrop blur
  - Drag-and-drop functionality for reordering questions (HTML5 Drag and Drop API)
  - Visual feedback during drag operations (draggedIndex, dragOverIndex states)
  - GripVertical icon as drag handle
  - Improved styling with gradient backgrounds for unselected items
  - Text color changes on hover (light text on dark background)
  - Responsive width adjustments for mobile/desktop

- **Answer Choice Randomization**: Enhanced visual experience for players:
  - Host can toggle "Randomize Answer Choices" option in lobby view
  - Each player sees answer options in a unique random order
  - Random border colors from palette: [#6366F1, #22D3EE, #F59E0B, #A855F7]
  - Glow effects matching GameStatsSidebar style (shadow-[0_0_30px_rgba(...)])
  - Selected answers use the same random color as their border
  - Colors only apply in default state (correct/wrong/selected states take precedence)
  - Randomization setting persists through game state

- **Game Stats Sidebar**: Enhanced player list with visual feedback:
  - Players who have submitted answers show their selected avatar (or initial) instead of lightbulb emoji
  - Players who have submitted answers glow with success color (#22C55E)
  - Glow effect matches answer choice styling (shadow-[0_0_30px_rgba(34,197,94,0.3)])
  - Success-colored background and border for submitted players
  - Real-time visual indication of answer submission status
  - Streak indicators (🔥) displayed when players achieve streak thresholds (configurable, default: 3+ consecutive correct)
  - Players automatically appear in real-time without requiring page refresh
  - Active players with streaks are highlighted during gameplay

- **Winner Display**: Improved mobile experience:
  - Increased mobile proportions by ~56% (two 25% increases)
  - Responsive text sizes, padding, and spacing
  - Larger rank badges and improved touch targets
  - Desktop sizes remain unchanged

- **Host Dashboard**: Responsive improvements:
  - Compact header with responsive padding and text sizes
  - Grid layout that fits content without scrolling
  - Improved spacing and padding for mobile devices
  - All content accessible without page scrolling

- **Answer Choices Visual Design**: Enhanced with random colors and glow effects:
  - Each answer option gets a random color from the palette when question starts
  - Glow effects create visual interest and improve UX
  - Colors regenerate for each new question
  - Maintains all existing functionality (correct/wrong/selected states)

- **Question Editor & List Components**: Optimized component sizing and spacing to ensure all elements fit on screen without scrolling. Reduced padding, margins, and font sizes while maintaining readability and usability.

- **Leaderboard Modal**: Enhanced animation system with Framer Motion layout animations and spring physics for smoother, more dynamic transitions when players reorder. Added visual enhancements including medal emojis (🥇🥈🥉) for top 3 positions and improved visual hierarchy with ring effects and leader banners.

- **Modal Component**: Added configurable padding prop for flexible content spacing customization. Centered title text alignment.

- **Presentation Card**: Fixed button sizing inconsistencies and improved button dimensions for better usability and visual consistency.

- **Avatar Selection System**: New player avatar selection feature:
  - Players select an avatar after entering their nickname via `AvatarSelectionModal`
  - Dark-themed modal with smooth animations and category filtering
  - Avatar selection is required (modal cannot be closed without selection)
  - Avatars stored in sessionStorage for clean URLs (no long URL parameters)
  - Player avatars displayed throughout the game:
    - Lobby view with randomized colors and glow effects
    - GameStatsSidebar for submitted answers
    - PlayersListModal with matching layout and styling
    - Leaderboard displays with streak indicators
  - Fallback to player initials if avatar not available
  - Randomized border colors and glow effects for visual distinction

- **Streak Feature UI**: Comprehensive streak tracking and display:
  - Streak badges (🔥) appear when players achieve configurable streak thresholds
  - Default threshold: 3+ consecutive correct answers (customizable in scoring config)
  - Streaks displayed in:
    - LobbyView player list
    - GameStatsSidebar (Players and Leaderboard tabs)
    - LeaderboardModal
  - Streaks update in real-time when answers are revealed
  - Host dashboard automatically receives streak updates via socket events
  - Streak thresholds configurable per game session via scoring configuration

### Code Quality & Maintenance

- **Component Cleanup**: Removed 42+ unused UI components from `components/ui` folder, keeping only actively used components (button, form, input, toggle-switch, utils) to reduce bundle size and improve maintainability.
- **TypeScript Improvements**: Resolved type errors in QuestionDisplay component by removing redundant boolean comparisons that were causing type overlap issues.
- **Next.js Compliance**: Fixed Suspense boundary requirement for `useSearchParams()` hook in authentication page to comply with Next.js 13+ requirements, ensuring proper static rendering support.
- **Custom Hooks Refactoring**: Created reusable hooks for color generation:
  - `useRandomColors`: Generic hook for generating random colors for any list of items
  - `usePlayerColors`: Specific hook for player avatar color generation using `useRandomColors`
  - Both hooks used in LobbyView and PlayersListModal for consistent color generation
- **Utility Functions**: Created `generateAnswerColors` utility function in `lib/utils/colorUtils.ts` for answer option color generation, replacing redundant inline logic in game page.
- **State Management Improvements**:
  - Fixed stale closure issues in socket event handlers using `useRef` to track latest player state
  - Updated `addPlayer` reducer to handle player updates (e.g., streak changes) instead of only adding new players
  - Improved real-time synchronization between server and client for player data, avatars, and streaks
- **URL Optimization**: Switched from passing avatar data in URL parameters to using sessionStorage, resulting in cleaner, shorter URLs and improved UX.
- **Unit Testing Setup**: Comprehensive Jest testing environment configured:
  - **Testing Framework**: Jest with TypeScript support via `ts-jest` and `next/jest`
  - **React Testing**: React Testing Library for component testing with `@testing-library/react`, `@testing-library/jest-dom`, and `@testing-library/user-event`
  - **Test Environment**: jsdom environment for browser-like APIs in tests
  - **Configuration**:
    - `jest.config.ts`: Configured for Next.js App Router with path aliases, CSS/image mocking, and coverage collection
    - `jest.setup.ts`: Global mocks for Next.js router, Image component, and extended Jest matchers
  - **Mocks**: Created mocks for external dependencies:
    - `__mocks__/socket.io-client.ts`: Mock Socket.io client to prevent real connections
    - `__mocks__/redis.ts`: In-memory Redis mock for testing without real Redis instance
    - `__mocks__/fileMock.js`: Mock for static file imports (images, fonts)
  - **Test Coverage**: Unit tests for:
    - Scoring logic (`lib/scoring/calculateScore.test.ts`): Tests for time bonuses, streak bonuses, and total score calculation
    - Redux reducers (`store/slices/__tests__/gameSlice.test.ts`): Tests for game state management and reducer actions
  - **Test Scripts**: Added `test`, `test:watch`, and `test:coverage` scripts to package.json
  - **Documentation**: Created `TESTING_SETUP.md` and `JEST_FLOW.md` for comprehensive testing documentation
  - **Next.js Image Component**: Replaced all `<img>` elements with Next.js `Image` component for automatic optimization, lazy loading, and better performance

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
    - Responsive layout: 1 column for few players, 2 columns for many players
    - Scrollable overflow for large player lists
    - Centered text alignment with consistent emoji positioning
  - **Player Exit Control**: Players who leave cannot rejoin with the same name
  - **Answer Reveal Modal**: Dedicated modal showing correct answer and distribution when host reveals
    - Automatically opens when question ends
    - Shows leaderboard with player scores
    - "Reveal Winner" button on last question
    - "End Game" button after winner is revealed
  - **Real-Time Answer Tracking**: Player avatars (or initials) with success glow show which players have submitted answers
  - **Smart Answer Reveal**: Button only enabled when all connected players have submitted
  - **Timer Control**: Timer automatically stops (set to 0) when answer is revealed
  - **Question Navigation**: Navigate between questions with automatic state reset
    - **Previous Question Review Mode**: When navigating to any previously answered question (forward or backward):
      - Automatically detects if question has been answered (checks Redis for existing answers)
      - Question is displayed in review mode (read-only)
      - Correct answer is automatically revealed
      - Players see their previous answer highlighted
      - Players cannot change their answers in review mode
      - "Start Question" button is disabled for answered questions (prevents restarting answered questions)
      - Question status is set to "QUESTION_ENDED" (no timer, no active submission)
      - Timer does not run in review mode
      - Works for both navigating backward and forward to answered questions
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
  - **Clean Session State**: Each new game session starts with fresh state (no carryover from previous sessions)
    - Game state flags (isReviewMode, answerRevealed) are reset for new sessions
    - All modals are closed when starting a new session
    - Prevents old game state from appearing in new sessions

- **Player Experience (Mobile-First)**
  - **Nickname Entry**: Full-screen form for entering player nickname with validation
  - **Avatar Selection**: After entering nickname, players select an avatar from a curated collection:
    - Dark-themed modal with smooth animations
    - Category filtering (animals, tech, nature, etc.)
    - Avatar selection required before joining game
    - Avatars displayed throughout the game experience
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
  - **Email Verification**: New users must verify their email address via magic link before signing in
  - **Forgot Password**: Secure password reset flow via email links
  - **Email Verification Alert**: Yellow alert shown when users with unverified emails attempt to sign in
  - Password visibility toggle on sign in/sign up
  - User profiles with MongoDB Atlas storage
  - Session management with NextAuth.js
  - Email delivery via Resend (sent from the app on Fly.io; no worker required)

- **Host Dashboard Features**
  - Desktop-first two-column layout (question control on left, live monitoring on right)
  - Real-time player count and answer submission tracking
  - Live answer distribution visualization
  - **Leaderboard Display**: Shows all players with their scores, sorted by rank
  - Question navigation (previous/next) with automatic state reset
    - **Previous Question Review**: Navigating to any previously answered question:
      - Automatically detects if question has been answered (works for forward and backward navigation)
      - Loads answer distribution and player responses
      - Disables "Start Question" button (tooltip explains why)
      - Prevents restarting questions that have already been answered
      - Sets question to review mode for players
      - Timer does not run in review mode
  - Answer reveal modal with distribution charts and leaderboard
  - **Reveal Winner**: Button on last question to announce winner to all players
  - **End Game**: Confirmation modal to end game session, disconnects all players
  - Session status checks (prevents access to ended sessions)
  - Real-time stats updates via Socket.io events
  - Visual indicators showing which players have submitted answers (player avatars with success glow)
  - **Player Avatars**: Displays player-selected avatars with randomized colors and glow effects
  - **Streak Indicators**: Shows streak badges (🔥) when players achieve streak thresholds
  - **Automatic Player Updates**: Players appear automatically in real-time without requiring page refresh

- **User Experience**
  - Custom loading animations
  - Reusable modal components (Modal, DeleteConfirmationModal, PlayersListModal, GameWelcomeModal, AnswerRevealModal)
  - Reusable layout components (CenteredLayout)
  - Responsive design with dark mode support
  - Intuitive UI with modern styling
  - Accurate countdown timers using timestamp-based calculations

## Tech Stack

### Frontend

- **Framework**: Next.js 16 (App Router) with custom server
- **Language**: TypeScript
- **UI**: React 19, Radix UI primitives, Framer Motion, Lucide React icons
- **Styling**: Tailwind CSS v4
- **State Management**: Redux Toolkit with React-Redux (game, host, player, socket, UI slices)
- **Forms**: React Hook Form with Zod validation (@hookform/resolvers)

### Backend & API

- **Runtime**: Node.js 20, tsx for TypeScript server execution
- **Server**: Custom HTTP server (`server.ts`) for Socket.io integration with Next.js
- **API Routes**: Next.js App Router route handlers (auth, sessions, presentations, health, QR, debug)

### Data & Real-time

- **Database**: MongoDB Atlas (presentations, hosts/users, auth_tokens, email_jobs)
- **Cache / Session Store**: Redis (Upstash compatible) for game state, player data, session codes
- **WebSocket**: Socket.io with Redis adapter for multi-instance support; path `/api/socket`
- **QR Codes**: qrcode (server-side) for join links

### Auth & Email

- **Authentication**: NextAuth.js v5 (credentials provider, email verification required)
- **Password**: bcryptjs for hashing; auth tokens hashed with bcrypt
- **Email**: Resend API for transactional email (verification, password reset)
  - Sent from the app via `lib/send-email-resend.ts` (no separate worker required on Fly.io)
  - From address: `noreply@ha-hootz.com` (verify ha-hootz.com in Resend Domains)
  - Templates: `lib/email-templates.ts`; optional shell worker for retries

### Deployment & Hosting

- **Primary**: Fly.io (Dockerfile, fly.toml; health check `/api/health`)
- **Custom Domain**: www.ha-hootz.com and ha-hootz.com (Squarespace DNS; TLS via Fly certs, DNS-01 when needed)
- **Secrets**: Fly secrets for MONGODB_URI, REDIS_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, APP_URL, RESEND_API_KEY, RESEND_FROM_EMAIL, ADDITIONAL_ORIGINS (optional)

### Testing & Quality

- **Testing**: Jest, React Testing Library, jsdom, ts-jest; mocks for Redis, Socket.io, Next router
- **Linting**: ESLint (eslint-config-next)

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
APP_URL=http://localhost:3000
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=noreply@ha-hootz.com
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
   - After registration, check your email for a verification link
   - You must verify your email before you can sign in
2. **Sign In**: Use your credentials to sign in at `/auth/signin`
   - Password visibility toggle available for easy verification
   - If your email is not verified, you'll see a yellow alert with option to resend verification
   - Click "Forgot password?" to reset your password via email
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
   - Select an avatar from the avatar selection modal
   - Join the lobby and wait for host to start
   - Your avatar will be displayed throughout the game
   - Answer questions with large, touch-friendly buttons
   - See countdown timer and change answers while time is active
   - Answers auto-submit when timer expires
   - Streak badges appear when you achieve consecutive correct answers

## Project Structure

```
ha-hootz/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts    # NextAuth configuration
│   │   │   ├── register/route.ts         # User registration with email verification
│   │   │   ├── verify-email/route.ts     # Email verification handler (legacy redirect)
│   │   │   ├── verify-email-json/route.ts # Email verification handler (JSON response)
│   │   │   ├── forgot-password/route.ts  # Password reset request
│   │   │   ├── reset-password/route.ts   # Password reset completion
│   │   │   ├── resend-verification/route.ts # Resend verification email
│   │   │   └── check-verification/route.ts  # Check email verification status
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
│   │   ├── page.tsx                        # Main auth page (sign in/sign up with email verification)
│   │   ├── signin/page.tsx                # Sign in page (redirects to /auth?mode=signin)
│   │   ├── signup/page.tsx                # Sign up page (redirects to /auth?mode=signup)
│   │   ├── verify-email/page.tsx          # Email verification page (magic link handler)
│   │   └── reset-password/page.tsx        # Password reset page (reset link handler)
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
│   ├── AvatarSelectionModal.tsx          # Modal for players to select avatars
│   ├── GameWelcomeModal.tsx               # Welcome modal for players when game starts
│   ├── AnswerRevealModal.tsx              # Modal showing correct answer and distribution
│   ├── WinnerDisplay.tsx                   # Full-screen winner announcement for players
│   ├── ThankYouModal.tsx                  # Thank you modal when host ends game
│   ├── CenteredLayout.tsx                 # Reusable centered layout component
│   ├── LobbyView.tsx                      # Host lobby view with player list, QR code, and session info
│   ├── GameStatsSidebar.tsx               # Host dashboard sidebar with player stats, leaderboard, and answer tracking
│   ├── LeaderboardModal.tsx               # Full leaderboard modal with streak indicators
│   └── Providers.tsx                      # Session provider wrapper
├── lib/
│   ├── auth.ts                            # Session helper
│   ├── db.ts                               # Database helpers
│   ├── mongodb.ts                          # MongoDB connection
│   ├── auth-tokens.ts                      # Token generation and verification for email auth
│   ├── email-jobs.ts                      # Email job management for async delivery
│   ├── email-templates.ts                 # Email template generation (verification, reset)
│   ├── redis/
│   │   ├── client.ts                       # Redis connection (serverless-safe)
│   │   ├── keys.ts                         # Redis key generators (includes playerAvatarsKey, playerStreaksKey)
│   │   └── triviaRedis.ts                  # Redis helpers for trivia sessions
│   ├── socket/
│   │   ├── server.ts                       # Socket.io server getter (accesses global instance)
│   │   ├── initSocket.ts                   # Socket.io setup with Redis adapter
│   │   └── handlers/
│   │       ├── host.handlers.ts            # Host event handlers (host-join, START_GAME, START_QUESTION, CANCEL_SESSION)
│   │       └── player.handlers.ts         # Player event handlers (join-session, SUBMIT_ANSWER)
│   ├── scoring/
│   │   ├── calculateScore.ts               # Scoring calculation functions (time bonus, streak bonus, total score)
│   │   └── calculateScore.test.ts         # Unit tests for scoring logic
│   ├── types.ts                            # Trivia session types
│   ├── questionConverter.ts                # Question format converters
│   ├── storage.ts                          # API client for presentations
│   ├── utils.ts                            # Utility functions (generateId, formatDate)
│   └── utils/
│       └── colorUtils.ts                   # Color generation utilities (generateAnswerColors)
├── store/
│   ├── index.ts                            # Redux store configuration
│   ├── hooks.ts                            # Typed Redux hooks (useAppDispatch, useAppSelector)
│   ├── StoreProvider.tsx                   # Redux Provider component for Next.js App Router
│   └── slices/
│       ├── gameSlice.ts                    # Game state slice (status, questions, review mode)
│       ├── __tests__/
│       │   └── gameSlice.test.ts           # Unit tests for gameSlice reducer
│       ├── hostSlice.ts                    # Host state slice (players with avatars and streaks, stats, leaderboard)
│       ├── playerSlice.ts                  # Player state slice (answers, timer, leaderboard)
│       ├── socketSlice.ts                  # Socket connection state slice
│       └── uiSlice.ts                      # UI state slice (modals, errors, loading)
├── hooks/
│   ├── usePlayerColors.ts                  # Hook for generating random colors for player avatars
│   └── useRandomColors.ts                  # Generic hook for generating random colors for any list
├── __mocks__/
│   ├── socket.io-client.ts                 # Mock Socket.io client for testing
│   ├── redis.ts                            # In-memory Redis mock for testing
│   └── fileMock.js                         # Mock for static file imports (images, fonts)
├── jest.config.ts                          # Jest configuration for Next.js App Router
├── jest.setup.ts                           # Jest setup file with global mocks and matchers
├── TESTING_SETUP.md                        # Comprehensive testing setup documentation
├── JEST_FLOW.md                            # Detailed Jest execution flow documentation
├── scripts/
│   ├── email-worker.sh                     # Email worker script (polls and sends emails)
│   ├── email-worker-helper.js              # Node.js helper for MongoDB operations
│   └── send-email.sh                       # Standalone email sending script
├── server.ts                               # Custom Next.js server with Socket.io integration
└── types/
    ├── index.ts                            # TypeScript types
    └── next-auth.d.ts                      # NextAuth type extensions
```

## Reusable Components

### Modal Components

- **`Modal.tsx`**: Base reusable modal component with customizable size, title, and content
- **`DeleteConfirmationModal.tsx`**: Specialized modal for delete confirmations with customizable messages (supports player mode)
- **`PlayersListModal.tsx`**: Modal showing joined players with countdown timer before starting game. Displays player avatars with randomized colors and glow effects, matching LobbyView styling.
- **`AvatarSelectionModal.tsx`**: Modal for players to select an avatar after entering their nickname. Features dark theme, category filtering, smooth animations, and requires selection before proceeding.
- **`GameWelcomeModal.tsx`**: Enhanced welcome modal for players when game session starts. Features smooth animations, countdown timer (auto-closes after 5 seconds), animated icon, and staggered content reveals.
- **`AnswerRevealModal.tsx`**: Modal displaying correct answer, answer distribution, leaderboard, and navigation controls
- **`WinnerDisplay.tsx`**: Full-screen winner announcement component showing player rank and full leaderboard
- **`ThankYouModal.tsx`**: Enhanced thank you modal displayed to players when host ends game. Features modern animations, gradient call-to-action card, animated celebration emoji, and encourages account creation with smooth transitions.
- **`Loading.tsx`**: Enhanced loading component with 5 animation variants (dots, pulse, bars, orbit, wave) and 3 size options (small, medium, large). Features smooth Framer Motion animations with app-themed colors. Supports both full-screen and inline modes with customizable messages.

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
<Loading message="Loading players..." fullScreen={false} variant="dots" size="small" />
<Loading message="Game in progress..." fullScreen={false} variant="pulse" size="medium" />

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

- `POST /api/auth/register` - Register a new user (creates unverified account, sends verification email)
- `GET /api/auth/verify-email?token=...` - Verify email address via magic link (legacy redirect endpoint)
- `GET /api/auth/verify-email-json?token=...` - Verify email address via magic link (JSON response)
- `POST /api/auth/forgot-password` - Request password reset email
- `POST /api/auth/reset-password` - Complete password reset with token
- `POST /api/auth/resend-verification` - Resend email verification link
- `POST /api/auth/check-verification` - Check if user's email is verified (requires valid credentials)
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
- `GET /api/sessions/validate/[sessionCode]?hostCheck=true` - Validate session code with host ownership check (allows host access to live/ended sessions)

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

- `join-session` - Join a game session (requires `sessionCode`, `name`, `avatarUrl` optional)
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
- `player-joined` - Player joined session (includes `playerId`, `name`, `avatarUrl`, `streak`, `playerCount`)
- `player-streaks-updated` - Player streaks updated after answer reveal (includes `sessionCode`, `streaks` object mapping playerId to streak count)
- `player-left` - Player left session (includes `playerId`, `playerCount`)
- `answer-stats-updated` - Answer statistics updated (includes `questionIndex`, `answerCount`, `answerDistribution`, `playersWithAnswers`, `playerScores`)
- `session-cancelled` - Session was cancelled (includes `sessionCode`, `message`)
- `error` - Error occurred (includes `message`)

**Player Events:**

- `joined-session` - Successfully joined session (includes `gameState`, `playerCount`, `playerAnswers`, `avatarUrl`)
- `join-error` - Failed to join (includes `reason`)
- `player-joined` - Another player joined (includes `playerId`, `name`, `avatarUrl`, `streak`, `playerCount`)
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

### Users Collection (hosts)

```typescript
{
  _id: ObjectId,
  email: string,
  password: string (hashed),
  name?: string,
  emailVerified: boolean,  // New: Email verification status
  createdAt: string,
  updatedAt: string
}
```

### auth_tokens Collection

```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  type: "verify_email" | "reset_password",
  tokenHash: string,  // Hashed with bcrypt
  expiresAt: Date,
  usedAt?: Date,
  createdAt: Date
}
```

### email_jobs Collection

```typescript
{
  _id: ObjectId,
  toEmail: string,
  template: "verify_email" | "reset_password",
  payload: object,  // JSON payload (token, name, etc.)
  status: "pending" | "sent" | "failed",
  attempts: number,
  lastError?: string,
  createdAt: Date
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

| Variable            | Description                                                      | Required |
| ------------------- | ---------------------------------------------------------------- | -------- |
| `MONGODB_URI`       | MongoDB Atlas connection string                                  | Yes      |
| `MONGODB_DB_NAME`   | Database name (defaults to 'ha-hootz')                           | No       |
| `REDIS_URL`         | Redis connection URL (Upstash compatible)                        | Yes      |
| `NEXTAUTH_SECRET`   | Secret for JWT signing                                           | Yes      |
| `NEXTAUTH_URL`      | Base URL of your application                                     | Yes      |
| `APP_URL`           | Base URL for email links (defaults to NEXTAUTH_URL)              | No       |
| `RESEND_API_KEY`    | Resend API key for email delivery                                | Yes      |
| `RESEND_FROM_EMAIL` | From email address for emails (defaults to noreply@ha-hootz.com) | No       |

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

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Testing

This project uses Jest with React Testing Library for unit testing. The testing setup is configured for Next.js App Router and TypeScript.

### Test Structure

- **Unit Tests**: Located in `__tests__` directories or files ending in `.test.ts`/`.test.tsx`
- **Test Configuration**: `jest.config.ts` and `jest.setup.ts`
- **Mocks**: Located in `__mocks__` directory for external dependencies

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Coverage

Current test coverage includes:

- **Scoring Logic** (`lib/scoring/calculateScore.test.ts`):
  - Time bonus calculations
  - Streak bonus calculations
  - Total score calculations with various configurations

- **Redux Reducers** (`store/slices/__tests__/gameSlice.test.ts`):
  - Game state management
  - Session code management
  - Question state updates
  - Answer reveal state

### Testing Documentation

For detailed information about the testing setup, see:

- **`TESTING_SETUP.md`**: Complete guide to the testing environment, dependencies, configuration, and example tests
- **`JEST_FLOW.md`**: Detailed explanation of how Jest executes tests, including the execution timeline and common issues

### Mocked Dependencies

The following external dependencies are automatically mocked in tests:

- **Next.js Router** (`next/navigation`): Mocked to prevent router errors
- **Next.js Image** (`next/image`): Mocked to prevent image optimization in tests
- **Socket.io Client**: Mocked to prevent real socket connections
- **Redis**: In-memory mock for testing without a real Redis instance
- **CSS Modules**: Mocked using `identity-obj-proxy`
- **Static Files**: Images and fonts are mocked

### Writing Tests

When writing new tests:

1. Place test files next to the code they test or in `__tests__` directories
2. Use descriptive test names that explain what is being tested
3. Test user behavior, not implementation details
4. Use React Testing Library queries (`getByRole`, `getByText`, etc.)
5. Mock external dependencies (Socket.io, Redis, etc.)
6. Keep tests isolated and independent

Example test structure:

```typescript
import { render, screen } from "@testing-library/react";
import { calculateScore } from "./calculateScore";

describe("calculateScore", () => {
  it("should return base points for correct answer", () => {
    const score = calculateScore({
      /* ... */
    });
    expect(score).toBe(100);
  });
});
```

## Email Authentication

Ha-Hootz includes a comprehensive email-based authentication system with email verification and password reset functionality.

### Features

- **Email Verification**: New users receive a magic link via email to verify their account
- **Password Reset**: Users can request a password reset link via email
- **Email delivery via Resend**: Emails are sent from the app (register, forgot-password, resend-verification). On Fly.io no separate worker is required.
- **Security**: Tokens are hashed before storage, single-use, and expire after 15-30 minutes
- **Rate Limiting**: Prevents token spam (max 3 tokens per user per type per hour)
- **Email Enumeration Protection**: Same response for all requests to prevent email discovery

### Resend (production)

On **Fly.io**, verification and password-reset emails are sent **from the app** via the Resend API (`lib/send-email-resend.ts`). Set secrets and you’re done; no separate worker is required.

- **From address**: `noreply@ha-hootz.com` (verify ha-hootz.com in [Resend Domains](https://resend.com/domains))
- **Secrets**: `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (optional; defaults to noreply@ha-hootz.com)
- **Troubleshooting**: See `docs/RESEND_TROUBLESHOOTING.md`

### Email worker (optional, retries only)

The shell script worker (`scripts/email-worker.sh`) is **optional**. It only retries jobs that failed to send (e.g. Resend was down). Use it if you run it locally or as a separate process; the app does not require it on Fly.io.

### Email Templates

Email templates are generated using `lib/email-templates.ts`:

- **Verification Email**: Magic link to verify email address
- **Password Reset Email**: Secure link to reset password

Both templates include:

- HTML and plaintext versions
- Responsive design
- Clear call-to-action buttons
- Security warnings

### User Flow

1. **Registration**: User signs up → receives verification email → clicks link → email verified
2. **Sign In (Unverified)**: User attempts sign in → yellow alert shown → can resend verification email
3. **Forgot Password**: User clicks "Forgot password?" → enters email → receives reset link → sets new password

### Documentation

For detailed setup and implementation information, see:

- `docs/EMAIL_AUTH_SETUP.md` - Setup and usage guide
- `docs/EMAIL_AUTH_SCHEMA.md` - Database schema documentation
- `docs/EMAIL_AUTH_IMPLEMENTATION.md` - Implementation details
- `docs/RESEND_INTEGRATION.md` - Resend email provider integration

## Security Notes

- Passwords are hashed using bcryptjs before storage
- Authentication tokens are hashed with bcrypt before database storage
- Tokens are single-use and expire after 15-30 minutes
- Rate limiting prevents token spam and abuse
- Email enumeration protection (same response for all requests)
- All API routes require authentication (except public auth endpoints)
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
- [x] Redux Toolkit integration for centralized state management
- [x] Previous question review mode improvements (works for forward and backward navigation)
- [x] Game state reset between sessions (prevents carryover from previous sessions)
- [x] Modal state reset for new sessions (ensures clean UI state)
- [x] Start Question button improvements (disabled for answered questions)
- [x] Player list layout improvements (responsive columns, scrollable overflow)
- [ ] Image support for questions
- [ ] Presentation sharing and collaboration
- [ ] Game history and analytics
