import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

export interface Avatar {
  id: string;
  name: string;
  imageUrl: string;
  category: "sports" | "animals" | "robots" | "flowers" | "planets";
}

interface AvatarSelectionModalProps {
  isOpen: boolean;
  playerName: string;
  onSelectAvatar: (avatar: Avatar) => void;
  onClose?: () => void;
}

const AVATARS: Avatar[] = [
  {
    id: "soccer",
    name: "Soccer Star",
    imageUrl: "/images/Soccer.jpg",
    category: "sports",
  },
  {
    id: "basketball",
    name: "Hoops Hero",
    imageUrl: "/images/Basketball.jpg",
    category: "sports",
  },
  {
    id: "cat",
    name: "Clever Cat",
    imageUrl: "/images/Cat.jpg",
    category: "animals",
  },
  {
    id: "dog",
    name: "Daring Dog",
    imageUrl: "/images/dog.jpg",
    category: "animals",
  },
  {
    id: "robot1",
    name: "Tech Titan",
    imageUrl: "/images/Tech Titan.jpg",
    category: "robots",
  },
  {
    id: "robot2",
    name: "Robo Genius",
    imageUrl: "/images/Robot.jpg",
    category: "robots",
  },
  {
    id: "flower1",
    name: "Bloom Boss",
    imageUrl: "/images/Flower 1.jpg",
    category: "flowers",
  },
  {
    id: "flower2",
    name: "Sunny Bloom",
    imageUrl: "/images/Flower Two.jpg",
    category: "flowers",
  },
  {
    id: "jupiter",
    name: "Jupiter Jump",
    imageUrl: "/images/Jupiter.jpg",
    category: "planets",
  },
  {
    id: "earth",
    name: "Earth Explorer",
    imageUrl: "/images/Earth.jpg",
    category: "planets",
  },
];

export function AvatarSelectionModal({
  isOpen,
  playerName,
  onSelectAvatar,
  onClose,
}: AvatarSelectionModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<Avatar | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleConfirm = () => {
    if (selectedAvatar) {
      onSelectAvatar(selectedAvatar);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => {
            // Prevent closing by clicking outside - avatar selection is required
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0B1020] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-[#6366F1]/20"
          >
            {/* Header */}
            <div className="bg-linear-to-r from-[#6366F1] to-[#22D3EE] px-8 py-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-6 h-6" />
                <h2 className="text-3xl font-bold">Choose Your Avatar</h2>
              </div>
              <p className="text-white/90">
                Hey <span className="font-bold">{playerName}</span>! Pick an
                avatar to represent you in the game.
              </p>
            </div>

            {/* Avatar Grid */}
            <div className="p-8 overflow-y-auto max-h-[60vh] bg-[#0B1020]">
              <div className="grid grid-cols-5 gap-4">
                {AVATARS.map((avatar, index) => {
                  const isSelected = selectedAvatar?.id === avatar.id;
                  const isHovered = hoveredId === avatar.id;

                  return (
                    <motion.button
                      key={avatar.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedAvatar(avatar)}
                      onMouseEnter={() => setHoveredId(avatar.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className="relative group focus:outline-none"
                    >
                      {/* Avatar Image */}
                      <div
                        className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                          isSelected
                            ? "ring-4 ring-[#6366F1] shadow-lg shadow-[#6366F1]/30"
                            : "ring-2 ring-transparent hover:ring-[#22D3EE]/50"
                        }`}
                      >
                        <img
                          src={avatar.imageUrl}
                          alt={avatar.name}
                          className="w-full h-full object-cover"
                        />

                        {/* Overlay */}
                        <div
                          className={`absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent transition-opacity ${
                            isHovered || isSelected
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        />

                        {/* Selected Checkmark */}
                        <AnimatePresence>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              exit={{ scale: 0 }}
                              className="absolute top-2 right-2 w-8 h-8 bg-[#22C55E] rounded-full flex items-center justify-center shadow-lg"
                            >
                              <Check className="w-5 h-5 text-white" />
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Name Label */}
                        <div
                          className={`absolute bottom-0 left-0 right-0 p-2 text-center transition-opacity ${
                            isHovered || isSelected
                              ? "opacity-100"
                              : "opacity-0"
                          }`}
                        >
                          <p className="text-white text-xs font-semibold drop-shadow-lg">
                            {avatar.name}
                          </p>
                        </div>
                      </div>

                      {/* Category Badge */}
                      <div className="mt-2 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                            avatar.category === "sports"
                              ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                              : avatar.category === "animals"
                              ? "bg-green-500/20 text-green-300 border border-green-500/30"
                              : avatar.category === "robots"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : avatar.category === "flowers"
                              ? "bg-pink-500/20 text-pink-300 border border-pink-500/30"
                              : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {avatar.category}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Selection Hint */}
              {!selectedAvatar && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 text-center"
                >
                  <p className="text-sm text-[#E5E7EB]/50">
                    👆 Tap an avatar to select it
                  </p>
                </motion.div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-8 py-6 bg-[#1A1F35]/50 border-t border-[#6366F1]/20 flex items-center justify-between">
              {selectedAvatar ? (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden ring-2 ring-[#6366F1]">
                    <img
                      src={selectedAvatar.imageUrl}
                      alt={selectedAvatar.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[#E5E7EB]">
                      {selectedAvatar.name}
                    </p>
                    <p className="text-xs text-[#E5E7EB]/50">Selected avatar</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-[#E5E7EB]/50">
                  Select an avatar to continue
                </p>
              )}

              <motion.button
                whileHover={{ scale: selectedAvatar ? 1.02 : 1 }}
                whileTap={{ scale: selectedAvatar ? 0.98 : 1 }}
                onClick={handleConfirm}
                disabled={!selectedAvatar}
                className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                  selectedAvatar
                    ? "bg-linear-to-r from-[#6366F1] to-[#22D3EE] text-white shadow-lg shadow-[#6366F1]/30 hover:shadow-xl"
                    : "bg-[#E5E7EB] text-[#9CA3AF] cursor-not-allowed"
                }`}
              >
                Confirm
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
