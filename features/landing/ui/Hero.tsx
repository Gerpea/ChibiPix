'use client';

import { motion } from 'framer-motion';

const HeroSection = () => {
  return (
    <section className="relative overflow-hidden bg-white px-4 py-20 text-center sm:py-32 dark:bg-gray-900">
      <div className="mx-auto max-w-4xl">
        <motion.h1
          className="mb-4 text-4xl font-extrabold text-gray-900 sm:text-6xl dark:text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          Bring Your Pixel Art to Life.
        </motion.h1>
        <motion.p
          className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 sm:text-xl dark:text-gray-300"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          A free, web-based pixel art and animation tool with powerful features.
          No installation required.
        </motion.p>
        <motion.a
          href="/app"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded-lg bg-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg transition-transform duration-200 ease-in-out hover:scale-105 hover:bg-blue-700 active:scale-95"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.5,
            delay: 0.4,
            type: 'spring',
            stiffness: 120,
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Start Creating
        </motion.a>
      </div>
      <motion.div
        className="mx-auto mt-16 max-w-4xl"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        <div className="aspect-video rounded-xl bg-gray-200 p-2 shadow-2xl dark:bg-gray-700">
          <img
            src="/chibi-pix-demo.gif"
            alt="Chibi-Pix App Demo"
            className="h-full w-full rounded-lg object-cover"
          />
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
