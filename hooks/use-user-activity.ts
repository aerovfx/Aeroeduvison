import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

export function useUserActivity() {
  const { data: session } = useSession();
  const lastActivityRef = useRef<number>(0);
  const activityTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!session?.user?.email) return;

    const updateActivity = async () => {
      const now = Date.now();
      // Only update if at least 30 seconds have passed since last update
      if (now - lastActivityRef.current < 30000) return;

      try {
        await fetch('/api/users/activity', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        lastActivityRef.current = now;
      } catch (error) {
        console.error('Failed to update user activity:', error);
      }
    };

    const handleActivity = () => {
      // Clear existing timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }

      // Set new timeout to update activity after 5 seconds of inactivity
      activityTimeoutRef.current = setTimeout(updateActivity, 5000);
    };

    // Listen for user activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Update activity on page load
    updateActivity();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [session?.user?.email]);
}
