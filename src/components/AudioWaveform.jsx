import React, { useRef, useEffect, useState } from 'react';
import '../styles/AudioWaveform.css';

function AudioWaveform({ audioUrl, title }) {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef(null);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      audioRef.current.play().catch((error) => {
        console.warn('[AudioWaveform] Failed to play:', error);
      });
      setIsPlaying(true);
      drawWaveform();
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current || !audioRef.current || !audioRef.current.paused === false) {
      if (isPlaying) {
        animationRef.current = requestAnimationFrame(drawWaveform);
      }
      return;
    }

    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(100, 200, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    if (isPlaying) {
      animationRef.current = requestAnimationFrame(drawWaveform);
    }
  };

  useEffect(() => {
    if (!audioRef.current) return;

    const handlePlayEnd = () => {
      setIsPlaying(false);
    };

    audioRef.current.addEventListener('ended', handlePlayEnd);

    return () => {
      audioRef.current?.removeEventListener('ended', handlePlayEnd);
    };
  }, []);

  useEffect(() => {
    if (!isPlaying) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;
    const audio = audioRef.current;

    if (!analyserRef.current) {
      const source = audioContext.createMediaElementAudioSource(audio);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      analyserRef.current = analyser;
    }

    drawWaveform();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  return (
    <div className="audio-waveform-container">
      <audio ref={audioRef} src={audioUrl} crossOrigin="anonymous" />

      <button className="audio-play-button" onClick={togglePlayPause} title={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? '⏸' : '▶'}
      </button>

      <canvas ref={canvasRef} className="audio-waveform-canvas" width={300} height={60} />
    </div>
  );
}

export default AudioWaveform;
