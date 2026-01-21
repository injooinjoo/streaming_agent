import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { API_URL } from '../config/api';
import socket from '../config/socket';
import './AdOverlay.css';

const CANVAS_WIDTH = 1920;
const CANVAS_HEIGHT = 1080;

// Individual Ad Slot Component
const AdSlot = ({ slot, activeAd, onImpression, onAdClick }) => {
  const impressionSent = useRef(false);

  useEffect(() => {
    // Send impression when ad becomes active
    if (activeAd && !impressionSent.current) {
      impressionSent.current = true;
      onImpression(slot.id, activeAd.id);
    }

    // Reset when ad changes
    if (!activeAd) {
      impressionSent.current = false;
    }
  }, [activeAd, slot.id, onImpression]);

  // Don't render anything if no active ad (completely transparent)
  if (!activeAd) {
    return null;
  }

  const slotStyle = {
    position: 'absolute',
    left: `${slot.position.x}%`,
    top: `${slot.position.y}%`,
    width: `${(slot.size.width / CANVAS_WIDTH) * 100}%`,
    height: `${(slot.size.height / CANVAS_HEIGHT) * 100}%`,
  };

  const handleClick = () => {
    if (activeAd.clickUrl) {
      onAdClick(slot.id, activeAd.id);
      window.open(activeAd.clickUrl, '_blank');
    }
  };

  return (
    <div
      className={`ad-slot ad-type-${activeAd.contentType}`}
      style={slotStyle}
      onClick={handleClick}
    >
      {activeAd.contentType === 'image' && (
        <img
          src={activeAd.contentUrl}
          alt={activeAd.name || 'Advertisement'}
          className="ad-content-image"
          draggable={false}
        />
      )}
      {activeAd.contentType === 'video' && (
        <video
          src={activeAd.contentUrl}
          className="ad-content-video"
          autoPlay
          muted
          loop
          playsInline
        />
      )}
      {activeAd.contentType === 'html' && (
        <iframe
          src={activeAd.contentUrl}
          className="ad-content-iframe"
          frameBorder="0"
          scrolling="no"
          title={activeAd.name || 'Advertisement'}
        />
      )}
    </div>
  );
};

// Main Ad Overlay Component
const AdOverlay = () => {
  const { userHash } = useParams();
  const [slots, setSlots] = useState([]);
  const [activeAds, setActiveAds] = useState({}); // Map of slotId -> activeAd
  const [connected, setConnected] = useState(false);

  // Fetch user's ad slots configuration
  const fetchSlots = useCallback(async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/ads/slots`
        : `${API_URL}/api/ads/slots`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Only include enabled slots
        setSlots((data.slots || data || []).filter(slot => slot.enabled));
      }
    } catch (err) {
      console.error('Failed to fetch ad slots:', err);
    }
  }, [userHash]);

  // Fetch active ads for each slot
  const fetchActiveAds = useCallback(async () => {
    try {
      const url = userHash
        ? `${API_URL}/api/overlay/${userHash}/ads/active`
        : `${API_URL}/api/ads/active`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // Convert array to map by slotId
        const adsMap = {};
        (data.ads || data || []).forEach(ad => {
          if (ad.slotId) {
            adsMap[ad.slotId] = ad;
          }
        });
        setActiveAds(adsMap);
      }
    } catch (err) {
      console.error('Failed to fetch active ads:', err);
    }
  }, [userHash]);

  // Record impression
  const handleImpression = useCallback(async (slotId, campaignId) => {
    try {
      await fetch(`${API_URL}/api/ads/impression`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          campaignId,
          userHash,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Failed to record impression:', err);
    }
  }, [userHash]);

  // Record click
  const handleAdClick = useCallback(async (slotId, campaignId) => {
    try {
      await fetch(`${API_URL}/api/ads/click`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId,
          campaignId,
          userHash,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err) {
      console.error('Failed to record click:', err);
    }
  }, [userHash]);

  useEffect(() => {
    fetchSlots();
    fetchActiveAds();

    // Join overlay room for real-time updates
    if (userHash) {
      socket.emit('join-ad-overlay', userHash);
    }

    // Connection status
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Listen for slot configuration updates
    socket.on('ad-slots-updated', (data) => {
      if (!userHash || data.userHash === userHash) {
        setSlots((data.slots || []).filter(slot => slot.enabled));
      }
    });

    // Listen for new ad campaign start
    socket.on('ad-campaign-start', (data) => {
      if (!userHash || data.userHash === userHash) {
        setActiveAds(prev => ({
          ...prev,
          [data.slotId]: data.ad,
        }));
      }
    });

    // Listen for ad campaign end
    socket.on('ad-campaign-end', (data) => {
      if (!userHash || data.userHash === userHash) {
        setActiveAds(prev => {
          const updated = { ...prev };
          delete updated[data.slotId];
          return updated;
        });
      }
    });

    // Listen for all ads refresh
    socket.on('ads-refresh', () => {
      fetchActiveAds();
    });

    // Listen for settings update
    socket.on('settings-updated', (data) => {
      if (data.key === 'ads') {
        fetchSlots();
        fetchActiveAds();
      }
    });

    // Periodic refresh (every 30 seconds) as fallback
    const refreshInterval = setInterval(() => {
      fetchActiveAds();
    }, 30000);

    return () => {
      if (userHash) {
        socket.emit('leave-ad-overlay', userHash);
      }
      socket.off('connect');
      socket.off('disconnect');
      socket.off('ad-slots-updated');
      socket.off('ad-campaign-start');
      socket.off('ad-campaign-end');
      socket.off('ads-refresh');
      socket.off('settings-updated');
      clearInterval(refreshInterval);
    };
  }, [userHash, fetchSlots, fetchActiveAds]);

  // Only render if there are slots and at least one active ad
  const hasActiveAds = Object.keys(activeAds).length > 0;

  return (
    <div className="ad-overlay-container">
      {slots.map(slot => (
        <AdSlot
          key={slot.id}
          slot={slot}
          activeAd={activeAds[slot.id]}
          onImpression={handleImpression}
          onAdClick={handleAdClick}
        />
      ))}

      {/* Debug indicator (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="ad-debug-indicator">
          <span className={`connection-status ${connected ? 'connected' : 'disconnected'}`} />
          {slots.length} slots | {Object.keys(activeAds).length} active
        </div>
      )}
    </div>
  );
};

export default AdOverlay;
