import React, { createContext, useState, useCallback, useRef, useEffect } from 'react';

export const CarouselContext = createContext();

export function CarouselProvider({ children }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [lightStrength, setLightStrength] = useState(1);
  const autoplayTimerRef = useRef(null);
  const [slideCount, setSlideCount] = useState(0);

  const pauseCarousel = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeCarousel = useCallback(() => {
    setIsPaused(false);
  }, []);

  const startAutoplay = useCallback(() => {
    setIsPaused(false);
  }, []);

  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
    setIsPaused(false);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % slideCount);
  }, [slideCount]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  // Track previous isPaused to detect transitions
  const prevIsPausedRef = useRef(isPaused);

  // Start autoplay only when isPaused transitions from true to false
  useEffect(() => {
    if (prevIsPausedRef.current === true && isPaused === false && slideCount > 0) {
      // User just clicked play - start the interval
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
      autoplayTimerRef.current = setInterval(() => {
        setCurrentIndex(prev => (prev + 1) % slideCount);
      }, 4000);
    } else if (isPaused === true && autoplayTimerRef.current) {
      // User paused - clear the interval
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    
    prevIsPausedRef.current = isPaused;

    return () => {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
    };
  }, [isPaused, slideCount]);

  const value = {
    currentIndex,
    setCurrentIndex,
    isGrabbing,
    setIsGrabbing,
    isPaused,
    setIsPaused,
    pauseCarousel,
    resumeCarousel,
    startAutoplay,
    goToSlide,
    nextSlide,
    prevSlide,
    slideCount,
    setSlideCount,
    lightStrength,
    setLightStrength,
  };

  return (
    <CarouselContext.Provider value={value}>
      {children}
    </CarouselContext.Provider>
  );
}

export function useCarousel() {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error('useCarousel must be used within a CarouselProvider');
  }
  return context;
}
