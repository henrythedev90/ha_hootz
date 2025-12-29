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

  // Confetti particles
  const confettiColors = ['#6366F1', '#22D3EE', '#22C55E', '#EF4444', '#FFD700'];
  const confetti = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
    x: Math.random() * 100,
  }));

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B1020] bg-opacity-95 p-4 overflow-y-auto relative">
      {/* Confetti */}
      {isWinner && confetti.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-2 h-2 rounded-sm animate-confetti"
          style={{
            backgroundColor: particle.color,
            left: `${particle.x}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}

      <div className="relative z-10 w-full max-w-4xl">
        {/* Winner Section */}
        {isWinner && (
          <div className="mb-16 text-center">
            <div className="mb-6 animate-bounce">
              <div className="text-8xl">🏆</div>
            </div>
            
            <h1 className="text-6xl md:text-8xl font-bold mb-4 bg-gradient-to-r from-[#FFD700] via-[#22D3EE] to-[#6366F1] bg-clip-text text-transparent">
              {playerName}
            </h1>
            
            <p className="text-3xl md:text-4xl text-[#E5E7EB]/80 mb-2">
              is the Champion!
            </p>
            
            <div className="inline-block px-8 py-4 bg-gradient-to-r from-[#6366F1] to-[#22D3EE] rounded-full mt-4">
              <span className="text-4xl font-bold text-white">{playerScore} points</span>
            </div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="w-full">
          <h2 className="text-2xl font-semibold text-center mb-6 text-[#E5E7EB]">Final Leaderboard</h2>
          <div className="space-y-3">
            {leaderboard.length === 0 ? (
              <p className="text-center text-[#E5E7EB]/60 py-8">No players</p>
            ) : (
              leaderboard.map((player, index) => {
                const rank = index + 1;
                const isPlayer = player.playerId === playerId;
                const isTopThree = rank <= 3;

                return (
                  <div
                    key={player.playerId}
                    className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                      index === 0
                        ? 'bg-gradient-to-r from-[#FFD700]/20 to-[#FFD700]/10 border-2 border-[#FFD700]/50 shadow-[0_0_30px_rgba(255,215,0,0.2)]'
                        : index === 1
                        ? 'bg-gradient-to-r from-[#C0C0C0]/20 to-[#C0C0C0]/10 border-2 border-[#C0C0C0]/50'
                        : index === 2
                        ? 'bg-gradient-to-r from-[#CD7F32]/20 to-[#CD7F32]/10 border-2 border-[#CD7F32]/50'
                        : 'bg-[#1A1F35] border-2 border-[#6366F1]/20'
                    } ${isPlayer ? 'ring-4 ring-[#22D3EE]/50' : ''}`}
                  >
                    {/* Rank Badge */}
                    <div className={`flex-shrink-0 w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl ${
                      index === 0
                        ? 'bg-[#FFD700] text-[#0B1020]'
                        : index === 1
                        ? 'bg-[#C0C0C0] text-[#0B1020]'
                        : index === 2
                        ? 'bg-[#CD7F32] text-[#0B1020]'
                        : 'bg-[#6366F1]/30 text-[#6366F1]'
                    }`}>
                      {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                    </div>

                    {/* Player Name */}
                    <div className="flex-1">
                      <p className={`text-xl font-semibold ${
                        index === 0 ? 'text-[#FFD700]' : 'text-[#E5E7EB]'
                      }`}>
                        {player.name}
                        {isPlayer && <span className="ml-2 text-[#22D3EE]">(You)</span>}
                      </p>
                    </div>

                    {/* Score */}
                    <div className={`text-2xl font-bold ${
                      index === 0
                        ? 'text-[#FFD700]'
                        : index === 1
                        ? 'text-[#C0C0C0]'
                        : index === 2
                        ? 'text-[#CD7F32]'
                        : 'text-[#22D3EE]'
                    }`}>
                      {player.score}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear infinite;
        }
      `}</style>
    </div>
  );
}
