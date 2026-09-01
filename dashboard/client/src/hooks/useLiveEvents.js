import { useEffect, useRef, useState } from 'react';

// Subscribes to /api/events (Server-Sent Events). Returns a "version" number
// that bumps every time the server tells us a review was created or deleted,
// so any component can just refetch when version changes — that's how the
// reviews table / tables view / chart stay live while a PR is being
// reviewed, without polling on a timer.
export function useLiveEvents() {
  const [version, setVersion] = useState(0);
  const [live, setLive] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    const source = new EventSource('/api/events');
    sourceRef.current = source;

    source.onopen = () => setLive(true);
    source.onerror = () => setLive(false);
    source.onmessage = (evt) => {
      try {
        const payload = JSON.parse(evt.data);
        if (payload.type === 'connected') {
          setLive(true);
          return;
        }
        setLastEvent(payload);
        setVersion((v) => v + 1);
      } catch {
        // ignore malformed frames
      }
    };

    return () => source.close();
  }, []);

  return { version, live, lastEvent };
}
