import FeaturesSection from '@/features/landing/ui/Features';
import Footer from '@/features/landing/ui/Footer';
import GuideSection from '@/features/landing/ui/Guide';
import Header from '@/features/landing/ui/Header';
import HeroSection from '@/features/landing/ui/Hero';
import Head from 'next/head';

const LandingPage = () => {
  return (
    <div className="bg-white dark:bg-gray-900">
      <Head>
        <title>Chibi-Pix | A Simple Pixel Art Creator</title>
        <meta
          name="description"
          content="A free, web-based pixel art and animation tool with powerful features. No installation required."
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Header />

      <main>
        <HeroSection />
        <FeaturesSection />
        <GuideSection />
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
