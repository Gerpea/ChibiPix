'use client';

import { motion } from 'framer-motion';

const Header = () => {
  return (
    <motion.header
      className="sticky top-0 z-50 w-full bg-white/80 px-4 shadow-sm backdrop-blur-sm sm:px-6 lg:px-8 dark:bg-gray-900/80"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Chibi-Pix Logo" className="h-8 w-8" />
          <span className="text-xl font-bold text-gray-800 dark:text-white">
            Chibi-Pix
          </span>
        </div>
        <motion.a
          href="/app"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white shadow-md transition-colors hover:bg-blue-700"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Launch App
        </motion.a>
      </div>
    </motion.header>
  );
};

export default Header;
