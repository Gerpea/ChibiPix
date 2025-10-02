'use client';

import { motion } from 'framer-motion';
import React from 'react';

const toolsData = [
  { name: 'Pencil', description: 'The primary tool for drawing pixels.' },
  { name: 'Eraser', description: 'Removes pixels from the current layer.' },
  { name: 'Color Picker', description: 'Select any color from your canvas.' },
  { name: 'Layers Panel', description: 'Add, delete, and manage layers.' },
  {
    name: 'Animation Panel',
    description: 'Create and manage animation frames.',
  },
];

const hotkeysData = [
  { keys: ['B'], action: 'Select Brush Tool' },
  { keys: ['E'], action: 'Select Eraser Tool' },
  { keys: ['I'], action: 'Select Color Picker (Eyedropper)' },
  { keys: ['Ctrl', 'Z'], action: 'Undo last action' },
  { keys: ['Ctrl', 'Y'], action: 'Redo last action' },
  { keys: ['Ctrl', 'S'], action: 'Export/Save Project' },
];

const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const GuideSection: React.FC = () => {
  return (
    <motion.section
      className="bg-gray-50 px-4 py-16 sm:py-24 dark:bg-gray-900"
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="mb-4 text-3xl font-bold text-gray-800 sm:text-4xl dark:text-white">
          Tools & Hotkeys
        </h2>
        <p className="mb-12 text-lg text-gray-600 dark:text-gray-300">
          A quick guide to help you get started.
        </p>

        <div className="flex flex-col gap-12 lg:gap-16">
          <div>
            <h3 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-white">
              Tools
            </h3>
            <motion.ul
              className="mx-auto max-w-lg space-y-4 text-left"
              variants={listVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {toolsData.map((tool) => (
                <motion.li
                  key={tool.name}
                  variants={itemVariants}
                  className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"
                >
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {tool.name}
                  </p>
                  <p className="text-gray-500 dark:text-gray-400">
                    {tool.description}
                  </p>
                </motion.li>
              ))}
            </motion.ul>
          </div>

          <div>
            <h3 className="mb-6 text-2xl font-semibold text-gray-800 dark:text-white">
              Hotkeys
            </h3>
            <motion.ul
              className="mx-auto max-w-lg space-y-3 text-left"
              variants={listVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
            >
              {hotkeysData.map((hotkey) => (
                <motion.li
                  key={hotkey.action}
                  variants={itemVariants}
                  className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"
                >
                  <span className="text-gray-500 dark:text-gray-400">
                    {hotkey.action}
                  </span>
                  <div className="flex items-center gap-1">
                    {hotkey.keys.map((key) => (
                      <kbd
                        key={key}
                        className="rounded-md border border-gray-200 bg-gray-100 px-2 py-1.5 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default GuideSection;
