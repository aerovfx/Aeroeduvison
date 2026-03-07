"use client";

import ReactConfetti from "react-confetti";
import { useEffect, useState } from "react";

import { useConfettiStore } from "@/hooks/use-confetti-store";

export const ConfettiProvider = () => {
  const [isMounted, setIsMounted] = useState(false);
  const confetti = useConfettiStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || !confetti.isOpen) return null;

  return (
    <ReactConfetti
      className="pointer-events-none z-[100]"
      numberOfPieces={500}
      recycle={false}
      onConfettiComplete={() => {
        confetti.onClose();
      }}
    />
  )
}