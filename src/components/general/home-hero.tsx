"use client";

import React, { useMemo } from "react";
import {
  motion,
  AnimatePresence,
  LazyMotion,
  domAnimation,
  cubicBezier,
} from "motion/react";
import Image from "next/image";

// Utility function for combining classnames
function cnUtil(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

// Create easing function
const customEase = cubicBezier(0.645, 0.045, 0.355, 1.0);

// Memoized animation variants
const imageVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.9,
      ease: customEase,
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.9,
      ease: customEase,
    },
  },
};

const contentVariants = {
  initial: { opacity: 0, y: -80 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.9 },
  },
};

const slideVariants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.9,
      ease: customEase,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.9,
      ease: customEase,
    },
  },
};

// Images Slider Component
const ImagesSlider = React.memo(
  ({
    images,
    children,
    overlay = true,
    overlayClassName,
    className,
    currentIndex = 0,
  }: {
    images: string[];
    children?: React.ReactNode;
    overlay?: React.ReactNode;
    overlayClassName?: string;
    className?: string;
    currentIndex?: number;
  }) => {
    return (
      <div
        className={cnUtil(
          "overflow-hidden h-full w-full relative flex items-center justify-center",
          className
        )}
        style={{
          perspective: "1000px",
        }}
      >
        {children}
        {overlay && (
          <div
            className={cnUtil(
              "absolute inset-0 bg-black/80 z-40",
              overlayClassName
            )}
          />
        )}

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentIndex}
            variants={imageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0"
          >
            <Image
              src={images[currentIndex]}
              alt={`Slide ${currentIndex + 1}`}
              fill
              priority={currentIndex === 0}
              sizes="100vw"
              quality={85}
              className="object-cover object-center"
            />
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }
);

ImagesSlider.displayName = "ImagesSlider";

// Slide Content Data
const slideContent = [
  {
    title: "Revolutionize School Exams and Learning",
    description:
      "Streamline academic exams and foster student engagement with our secure, user-friendly platform. Perfect for schools and students aiming to excel.",
    primaryButton: "Get Started",
    secondaryButton: "Learn More",
  },
  {
    title: "Simplify Exam Creation and Management",
    description:
      "Easily create, manage, and administer multiple-choice exams. Upload questions manually or via Excel/CSV, and ensure fairness with unique codes and randomized formats.",
    primaryButton: "Create an Exam",
    secondaryButton: "View Features",
  },
  {
    title: "Engage, Compete, and Succeed",
    description:
      "Encourage learning through public exams, peer-to-peer challenges, and weekly leaderboards. Unlock access to past questions for major exams like WAEC, NECO, and JAMB.",
    primaryButton: "Join a Challenge",
    secondaryButton: "View Past Questions",
  },
  {
    title: "Track and Analyze Performance",
    description:
      "Empower students with personalized dashboards and detailed performance analytics. Make data-driven decisions to improve academic outcomes.",
    primaryButton: "View Dashboard",
    secondaryButton: "Learn More",
  },
];

// Memoized word animation component
const AnimatedWord = React.memo(
  ({
    word,
    index,
    slideIndex,
  }: {
    word: string;
    index: number;
    slideIndex: number;
  }) => (
    <motion.span
      key={`${slideIndex}-${index}`}
      initial={{ opacity: 0, filter: "blur(4px)", y: 10 }}
      animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.1,
        ease: "easeInOut",
      }}
      className="mr-2 inline-block"
    >
      {word}
    </motion.span>
  )
);

AnimatedWord.displayName = "AnimatedWord";

// Main Hero Component
export default function HeroSectionSlideshow() {
  const [currentSlide, setCurrentSlide] = React.useState(0);

  const images = useMemo(
    () => [
      "/images/student-writing-exam-with-computer.avif",
      "/images/examiner.avif",
      "/images/competitors.avif",
      "/images/performance-tracker.avif",
    ],
    []
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideContent.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const content = useMemo(() => slideContent[currentSlide], [currentSlide]);
  const titleWords = useMemo(() => content.title.split(" "), [content.title]);

  return (
    <LazyMotion features={domAnimation}>
      <motion.div className="relative w-full h-screen overflow-hidden">
        <ImagesSlider
          className="h-full w-full"
          images={images}
          currentIndex={currentSlide}
        >
          <motion.div
            variants={contentVariants}
            initial="initial"
            animate="animate"
            className="z-50 flex flex-col justify-center items-center px-4 h-full"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center"
              >
                <h1 className="relative z-10 mx-auto max-w-4xl text-center text-3xl font-bold text-white md:text-5xl lg:text-7xl">
                  {titleWords.map((word, index) => (
                    <AnimatedWord
                      key={`${currentSlide}-${index}`}
                      word={word}
                      index={index}
                      slideIndex={currentSlide}
                    />
                  ))}
                </h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.8 }}
                  className="relative z-10 mx-auto max-w-xl py-6 text-center text-base md:text-lg font-normal text-neutral-200"
                >
                  {content.description}
                </motion.p>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 1 }}
                  className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4"
                >
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-60 rounded-lg bg-white px-6 py-3 font-medium text-black transition-shadow duration-300 hover:shadow-xl"
                  >
                    {content.primaryButton}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    className="w-60 rounded-lg border-2 border-white bg-transparent px-6 py-3 font-medium text-white transition-all duration-300 hover:bg-white/10 hover:shadow-xl"
                  >
                    {content.secondaryButton}
                  </motion.button>
                </motion.div>

                {/* Slide Indicators */}
                <div className="mt-16 flex gap-2">
                  {slideContent.map((_, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      className={cnUtil(
                        "h-2 rounded-full transition-all duration-300",
                        currentSlide === index
                          ? "w-8 bg-white"
                          : "w-2 bg-white/50"
                      )}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </ImagesSlider>
      </motion.div>
    </LazyMotion>
  );
}
