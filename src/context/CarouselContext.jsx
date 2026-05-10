import React, { createContext, useState, useCallback, useRef, useEffect } from 'react';

export const CarouselContext = createContext();

export function CarouselProvider({ children }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [autoSpinEnabled, setAutoSpinEnabled] = useState(true);
  const [playSoundsEnabled, setPlaySoundsEnabled] = useState(true);
  const [lightStrength, setLightStrength] = useState(1);
  const autoplayTimerRef = useRef(null);
  const manualPauseRef = useRef(false);
  const [slideCount, setSlideCount] = useState(0);

  const pauseCarousel = useCallback((reason = 'interaction') => {
    if (reason === 'manual') {
      manualPauseRef.current = true;
    }
    setIsPaused(true);
  }, []);

  const resumeCarousel = useCallback(() => {
    if (manualPauseRef.current) return;
    setIsPaused(false);
  }, []);

  const startAutoplay = useCallback(() => {
    manualPauseRef.current = false;
    setIsPaused(false);
  }, []);

  const goToSlide = useCallback((index) => {
    setCurrentIndex(index);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % slideCount);
  }, [slideCount]);

  const prevSlide = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  // Keep a single autoplay interval synchronized to pause state.
  useEffect(() => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }

    if (!isPaused && slideCount > 0) {
      autoplayTimerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slideCount);
      }, 4000);
    }

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
    autoSpinEnabled,
    setAutoSpinEnabled,
    playSoundsEnabled,
    setPlaySoundsEnabled,
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
