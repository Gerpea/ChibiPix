'use client';

import { motion } from 'framer-motion';
import { Layers, Film, Download } from 'lucide-react';

const features = [
  {
    icon: <Layers size={32} className="text-blue-500" />,
    title: 'Powerful Layering',
    description:
      'Organize your art with an intuitive layer system, just like a professional tool.',
  },
  {
    icon: <Film size={32} className="text-green-500" />,
    title: 'Frame Animation',
    description:
      'Create animations frame-by-frame and export them as GIFs or spritesheets.',
  },
  {
    icon: <Download size={32} className="text-purple-500" />,
    title: 'Easy Export & Import',
    description:
      'Save your work to a custom project file or export to common formats like PNG.',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

const FeaturesSection = () => {
  return (
    <section className="bg-gray-50 px-4 py-16 sm:py-24 dark:bg-gray-900">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="mb-12 text-3xl font-bold text-gray-800 sm:text-4xl dark:text-white">
          Everything You Need to Create
        </h2>
        <motion.div
          className="grid grid-cols-1 gap-8 text-left md:grid-cols-3"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              className="rounded-xl bg-white p-6 shadow-md dark:bg-gray-800"
              variants={itemVariants}
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default FeaturesSection;
