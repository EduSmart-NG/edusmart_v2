"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";

// Utility function for combining classnames
function cnUtil(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(" ");
}

// Images Slider Component
const ImagesSlider = ({
  images,
  children,
  overlay = true,
  overlayClassName,
  className,
  currentIndex = 0,
  direction = "up",
}: {
  images: string[];
  children?: React.ReactNode;
  overlay?: React.ReactNode;
  overlayClassName?: string;
  className?: string;
  currentIndex?: number;
  direction?: "up" | "down";
}) => {
  const [loadedImages, setLoadedImages] = React.useState<string[]>([]);

  React.useEffect(() => {
    const loadImages = () => {
      const loadPromises = images.map((image) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.src = image;
          img.onload = () => resolve(image);
          img.onerror = reject;
        });
      });

      Promise.all(loadPromises)
        .then((loadedImages) => {
          setLoadedImages(loadedImages as string[]);
        })
        .catch((error) => console.error("Failed to load images", error));
    };

    loadImages();
  }, [images]);

  const areImagesLoaded = loadedImages.length > 0;

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
      {areImagesLoaded && children}
      {areImagesLoaded && overlay && (
        <div
          className={cnUtil(
            "absolute inset-0 bg-black/80 z-40",
            overlayClassName
          )}
        />
      )}

      {areImagesLoaded && (
        <AnimatePresence initial={false}>
          <motion.img
            key={currentIndex}
            src={loadedImages[currentIndex]}
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
              transition: {
                duration: 0.9,
                ease: [0.645, 0.045, 0.355, 1.0],
              },
            }}
            exit={
              direction === "up"
                ? {
                    opacity: 0,
                    // y: "-50%",
                    // scale: 0.95,
                    transition: {
                      duration: 0.9,
                      ease: [0.645, 0.045, 0.355, 1.0],
                    },
                  }
                : {
                    opacity: 0,
                    // y: "50%",
                    // scale: 0.95,
                    transition: {
                      duration: 0.9,
                      ease: [0.645, 0.045, 0.355, 1.0],
                    },
                  }
            }
            className="image h-full w-full absolute inset-0 object-cover object-center"
          />
        </AnimatePresence>
      )}
    </div>
  );
};

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

// Main Hero Component
export default function HeroSectionSlideshow() {
  const [currentSlide, setCurrentSlide] = React.useState(0);

  const images = [
    "/images/student-writing-exam-with-computer.jpg",
    "/images/examiner.jpg",
    "/images/competitors.jpg",

    "/images/performance-tracker.jpg",
  ];

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slideContent.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const content = slideContent[currentSlide];

  return (
    <>
      <motion.div className="relative w-full h-screen overflow-hidden">
        <ImagesSlider
          className="h-full w-full"
          images={images}
          currentIndex={currentSlide}
        >
          <motion.div
            initial={{
              opacity: 0,
              y: -80,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.9,
            }}
            className="z-50 flex flex-col justify-center items-center px-4 h-full"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{
                  duration: 0.9,
                  ease: [0.645, 0.045, 0.355, 1.0],
                }}
                className="flex flex-col items-center"
              >
                <h1 className="relative z-10 mx-auto max-w-4xl text-center text-3xl font-bold text-white md:text-5xl lg:text-7xl">
                  {content.title.split(" ").map((word, index) => (
                    <motion.span
                      key={`${currentSlide}-${index}`}
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
                  ))}
                </h1>
                <motion.p
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  transition={{
                    duration: 0.3,
                    delay: 0.8,
                  }}
                  className="relative z-10 mx-auto max-w-xl py-6 text-center text-base md:text-lg font-normal text-neutral-200"
                >
                  {content.description}
                </motion.p>
                <motion.div
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  transition={{
                    duration: 0.3,
                    delay: 1,
                  }}
                  className="relative z-10 mt-8 flex flex-wrap items-center justify-center gap-4"
                >
                  <button className="w-60 transform rounded-lg bg-white px-6 py-3 font-medium text-black transition-all duration-300 hover:-translate-y-0.5 hover:bg-gray-100 hover:shadow-xl">
                    {content.primaryButton}
                  </button>
                  <button className="w-60 transform rounded-lg border-2 border-white bg-transparent px-6 py-3 font-medium text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-xl">
                    {content.secondaryButton}
                  </button>
                </motion.div>

                {/* Slide Indicators */}
                <div className="mt-16 flex gap-2">
                  {slideContent.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentSlide(index)}
                      className={cnUtil(
                        "h-2 rounded-full transition-all duration-300",
                        currentSlide === index
                          ? "w-8 bg-white"
                          : "w-2 bg-white/50 hover:bg-white/70"
                      )}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </ImagesSlider>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.8,
            delay: 1.5,
            repeat: Infinity,
            repeatType: "reverse",
          }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50"
        ></motion.div>
      </motion.div>
    </>
  );
}
