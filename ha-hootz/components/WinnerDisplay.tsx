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
  console.log("🎯 WinnerDisplay component called with:", {
    isOpen,
    playerName,
    playerId,
    leaderboardLength: leaderboard.length,
  });

  if (!isOpen) {
    console.log("❌ WinnerDisplay: isOpen is false, returning null");
    return null;
  }

  console.log("✅ WinnerDisplay: isOpen is true, rendering component");

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

  console.log("🎯 WinnerDisplay rendering:", {
    isOpen,
    playerName,
    playerId,
    leaderboardLength: leaderboard.length,
  });

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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 mb-6">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Your Final Rank
            </h2>
            <div
              className={`inline-flex items-center justify-center w-32 h-32 rounded-full text-6xl font-bold mb-4 ${
                isWinner
                  ? "bg-linear-to-br from-yellow-400 to-yellow-600 text-yellow-900 shadow-lg scale-110 animate-pulse"
                  : isSecond
                  ? "bg-linear-to-br from-gray-300 to-gray-500 text-gray-800 shadow-lg"
                  : isThird
                  ? "bg-linear-to-br from-orange-400 to-orange-600 text-orange-900 shadow-lg"
                  : "bg-linear-to-br from-blue-400 to-blue-600 text-white shadow-lg"
              }`}
            >
              {isWinner ? "👑" : `#${playerRank}`}
            </div>
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {playerName}
            </h3>
            <p className="text-2xl text-blue-600 dark:text-blue-400 font-semibold mb-4">
              {playerScore} points
            </p>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Out of {totalPlayers} {totalPlayers === 1 ? "player" : "players"}
            </p>
          </div>
        </div>

        {/* Full Leaderboard */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Final Leaderboard
          </h3>
          <div className="space-y-4">
            {leaderboard.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
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
                        ? "bg-blue-100 dark:bg-blue-900/50 border-blue-500 dark:border-blue-400 shadow-xl scale-105 ring-4 ring-blue-300 dark:ring-blue-600"
                        : isTopThree
                        ? rank === 1
                          ? "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-500 dark:border-yellow-500"
                          : rank === 2
                          ? "bg-gray-100 dark:bg-gray-700 border-gray-400 dark:border-gray-400"
                          : "bg-orange-100 dark:bg-orange-900/30 border-orange-500 dark:border-orange-500"
                        : "bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`text-3xl font-bold ${
                          isTopThree
                            ? rank === 1
                              ? "text-yellow-600 dark:text-yellow-400"
                              : rank === 2
                              ? "text-gray-600 dark:text-gray-400"
                              : "text-orange-600 dark:text-orange-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {rank === 1 ? "👑" : `#${rank}`}
                      </div>
                      <span
                        className={`flex-1 text-xl font-semibold ${
                          isPlayer
                            ? "text-blue-900 dark:text-blue-100"
                            : "text-gray-900 dark:text-white"
                        }`}
                      >
                        {player.name}
                        {isPlayer && (
                          <span className="ml-2 text-blue-600 dark:text-blue-400">
                            (You)
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-2xl font-bold ${
                          isPlayer
                            ? "text-blue-700 dark:text-blue-300"
                            : "text-blue-600 dark:text-blue-400"
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
