import React from 'react';
import { motion } from 'motion/react';

export default function SparkMark() {
  return (
    <div className="relative w-28 h-28 flex items-center justify-center">
      <motion.div
        aria-hidden="true"
        animate={{ scale: [1, 1.35, 1], opacity: [0.28, 0.55, 0.28] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute inset-0 rounded-full bg-[#C59A55]/35 blur-2xl"
      />
      {[0, 1].map((ring) => (
        <motion.span
          key={ring}
          aria-hidden="true"
          initial={{ opacity: 0.4, scale: 0.55 }}
          animate={{ opacity: [0.35, 0], scale: [0.55, 1.7] }}
          transition={{
            duration: 2.4,
            repeat: Infinity,
            delay: ring * 0.9,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="absolute w-16 h-16 rounded-full border border-[#F2EFE8]/25"
        />
      ))}
      <motion.span
        initial={{ opacity: 0, scale: 0.92, filter: 'blur(8px)' }}
        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative block w-3 h-3 rounded-full bg-[#F2EFE8] shadow-[0_0_28px_8px_rgba(197,154,85,0.55)]"
      />
    </div>
  );
}
