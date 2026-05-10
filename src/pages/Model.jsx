import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useResources } from '../context/ResourceContext';
import ModelDetailCanvas from '../components/ModelDetailCanvas';
import AudioWaveform from '../components/AudioWaveform';
import '../styles/Model.css';

function Model() {
  const { id } = useParams();
  const { modelConfigs, loading, resolveResourceValue } = useResources();
  const model = id ? modelConfigs?.[id] : null;

  if (loading) {
    return (
      <main className="model-page">
        <h1 className="model-title">Loading...</h1>
      </main>
    );
  }

  if (!model) {
    return (
      <main className="model-page">
        <h1 className="model-title">Model Not Found</h1>
        <p className="model-summary">The requested model key does not exist in model config.</p>
        <Link to="/" className="model-back-link">Back to carousel</Link>
      </main>
    );
  }

  return (
    <main className="model-page">
      <Link to="/" className="model-back-link">&larr; Back to carousel</Link>

      <div className='model-top-line'>
        <h1 className="model-title">{model.name}</h1>
      </div>

      <section className="model-section model-canvas-section">
        <ModelDetailCanvas productKey={model.key} />
      </section>

      <section className="model-section">
        <h2>{model.about?.title || 'Overview'}</h2>
        {model.about?.summary && <p className="model-summary">{model.about.summary}</p>}

        {Array.isArray(model.about?.details) && model.about.details.length > 0 && (
          <div className="model-details-list">
            {model.about.details.map((detail, index) => (
              <p key={`${model.key}-detail-${index}`}>{detail}</p>
            ))}
          </div>
        )}
      </section>
      
      {Array.isArray(model.about?.media) && model.about.media.length > 0 && (
        <section className="model-section">
          <h2>Media</h2>
          <div className="model-media-grid">
            {model.about.media.map((media, index) => {
              // Handle both string URLs and object media definitions
              const isString = typeof media === 'string';
              const mediaTitle = isString ? `Media ${index + 1}` : (media.title || `Media ${index + 1}`);
              const mediaUrl = isString ? media : media.src;
              const mediaPoster = isString ? undefined : resolveResourceValue(media.poster);
              const mediaType = isString ? 'auto' : (media.type || 'auto');

              // Detect YouTube URLs
              const youtubeMatch = mediaUrl?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
              const isYouTube = !!youtubeMatch;
              const youtubeEmbedUrl = youtubeMatch ? `https://www.youtube.com/embed/${youtubeMatch[1]}` : null;

              // Detect MP3 URLs
              const isMP3 = mediaUrl?.toLowerCase().endsWith('.mp3');

              const mediaSource = isString ? mediaUrl : resolveResourceValue(mediaUrl);

              return (
                <article key={`${model.key}-media-${index}`} className="model-media-card">
                  <h3>{mediaTitle}</h3>
                  {mediaSource ? (
                    isYouTube ? (
                      <iframe
                        className="model-media-iframe"
                        src={youtubeEmbedUrl}
                        title={mediaTitle}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : isMP3 ? (
                      <AudioWaveform audioUrl={mediaSource} title={mediaTitle} />
                    ) : mediaType === 'video' ? (
                      <video controls src={mediaSource} poster={mediaPoster || undefined} />
                    ) : (
                      <img src={mediaSource} alt={mediaTitle} />
                    )
                  ) : (
                    <p className="model-summary">Media source is missing from config.</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

export default Model;