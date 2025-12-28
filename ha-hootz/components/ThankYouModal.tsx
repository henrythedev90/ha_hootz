"use client";

interface ThankYouModalProps {
  isOpen: boolean;
  hostName: string | null;
  playerName: string | null;
  onClose?: () => void;
}

export default function ThankYouModal({
  isOpen,
  hostName,
  playerName,
  onClose,
}: ThankYouModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-8">
        <div className="text-center">
          {/* Thank You Icon */}
          <div className="text-6xl mb-4">🎉</div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Thank You for Playing!
          </h2>

          {/* Host Name */}
          {hostName && (
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
              Thanks for joining{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {hostName}
              </span>
              's trivia event!
            </p>
          )}

          {/* Player Name */}
          {playerName && (
            <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
              We hope you enjoyed playing,{" "}
              <span className="font-medium">{playerName}</span>!
            </p>
          )}

          {/* Call to Action */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Want to Host Your Own Event?
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Create your own Ha-Hootz account to start creating engaging
              presentations and host your own trivia events!
            </p>
            <button
              onClick={() => (window.location.href = "/auth/signup")}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-md"
            >
              Create Your Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
