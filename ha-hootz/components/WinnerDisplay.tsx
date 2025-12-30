"use client";

interface Player {
  playerId: string;
  name: string;
  score: number;
}

interface WinnerDisplayProps {
  isOpen: boolean;
  playerName: string;
  playerId: string;
  leaderboard: Player[];
}

export default function WinnerDisplay({
  isOpen,
  playerName,
  playerId,
  leaderboard,
}: WinnerDisplayProps) {
  if (!isOpen) {
    return null;
  }

  // Find player's rank and score
  const playerIndex = leaderboard.findIndex((p) => p.playerId === playerId);
  const playerRank = playerIndex >= 0 ? playerIndex + 1 : null;
  const playerScore = playerIndex >= 0 ? leaderboard[playerIndex].score : 0;
  const totalPlayers = leaderboard.length;

  // Determine if player is in top 3
  const isWinner = playerRank === 1;
  const isSecond = playerRank === 2;
  const isThird = playerRank === 3;
  const isTopThree = playerRank !== null && playerRank <= 3;

  // Get winner info
  const winner = leaderboard.length > 0 ? leaderboard[0] : null;
  const isTie =
    leaderboard.length > 1 &&
    leaderboard[0].score > 0 &&
    leaderboard[0].score === leaderboard[1].score;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black bg-opacity-90 p-4 overflow-y-auto">
      <div className="w-full max-w-4xl">
        {/* Winner Announcement Banner */}
        {isWinner && (
          <div className="mb-8 text-center animate-pulse">
            <div className="bg-linear-to-r from-yellow-400 via-yellow-500 to-yellow-600 dark:from-yellow-500 dark:via-yellow-600 dark:to-yellow-700 rounded-2xl p-12 shadow-2xl border-4 border-yellow-300 dark:border-yellow-500 transform scale-105">
              <div className="text-8xl mb-6 animate-bounce">🏆</div>
              <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
                {isTie ? "It's a Tie!" : "Congratulations!"}
              </h1>
              <h2 className="text-4xl text-yellow-100 mb-2 font-semibold">
                {playerName}
              </h2>
              <p className="text-3xl text-yellow-100 font-bold">
                You Won with {playerScore} points!
              </p>
            </div>
          </div>
        )}

        {/* Player's Rank Display */}
        <div className="bg-card-bg rounded-2xl shadow-2xl p-8 mb-6">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-text-light mb-6">
              Your Final Rank
            </h2>
            <div
              className={`inline-flex items-center justify-center w-32 h-32 rounded-full text-6xl font-bold mb-4 ${
                isWinner
                  ? "bg-gradient-to-br from-cyan to-indigo text-white shadow-lg scale-110 animate-pulse"
                  : isSecond
                  ? "bg-gradient-to-br from-card-bg to-deep-navy text-text-light shadow-lg border border-indigo/30"
                  : isThird
                  ? "bg-gradient-to-br from-cyan/50 to-indigo/50 text-text-light shadow-lg border border-cyan/30"
                  : "bg-gradient-to-br from-indigo to-cyan text-white shadow-lg"
              }`}
            >
              {isWinner ? "👑" : `#${playerRank}`}
            </div>
            <h3 className="text-3xl font-bold text-text-light mb-2">
              {playerName}
            </h3>
            <p className="text-2xl text-indigo font-semibold mb-4">
              {playerScore} points
            </p>
            <p className="text-lg text-text-light/70">
              Out of {totalPlayers} {totalPlayers === 1 ? "player" : "players"}
            </p>
          </div>
        </div>

        {/* Full Leaderboard */}
        <div className="bg-card-bg rounded-2xl shadow-2xl p-8">
          <h3 className="text-3xl font-bold text-text-light mb-6 text-center">
            Final Leaderboard
          </h3>
          <div className="space-y-4">
            {leaderboard.length === 0 ? (
              <p className="text-center text-text-light/50 py-8">
                No players
              </p>
            ) : (
              leaderboard.map((player, index) => {
                const rank = index + 1;
                const isPlayer = player.playerId === playerId;
                const isTopThree = rank <= 3;

                return (
                  <div
                    key={player.playerId}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      isPlayer
                        ? "bg-indigo/20 border-indigo shadow-xl scale-105 ring-4 ring-indigo/30"
                        : isTopThree
                        ? rank === 1
                          ? "bg-cyan/20 border-cyan"
                          : rank === 2
                          ? "bg-card-bg border-indigo/30"
                          : "bg-cyan/10 border-cyan/50"
                        : "bg-deep-navy border-indigo/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`text-3xl font-bold ${
                          isTopThree
                            ? rank === 1
                              ? "text-cyan"
                              : rank === 2
                              ? "text-text-light/50"
                              : "text-cyan/70"
                            : "text-text-light/50"
                        }`}
                      >
                        {rank === 1 ? "👑" : `#${rank}`}
                      </div>
                      <span
                        className={`flex-1 text-xl font-semibold ${
                          isPlayer
                            ? "text-indigo"
                            : "text-text-light"
                        }`}
                      >
                        {player.name}
                        {isPlayer && (
                          <span className="ml-2 text-indigo/70">
                            (You)
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-2xl font-bold ${
                          isPlayer
                            ? "text-indigo"
                            : "text-indigo/80"
                        }`}
                      >
                        {player.score} pts
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
