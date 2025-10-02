const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 text-center text-gray-500 dark:text-gray-400">
        <p>&copy; {year} Chibi-Pix. Created by [Your Name].</p>
        <a
          href="https://github.com/Gerpea/ChibiPix"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-blue-600 hover:underline"
        >
          View on GitHub
        </a>
      </div>
    </footer>
  );
};

export default Footer;
