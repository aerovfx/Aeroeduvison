"use client";

import { useUserActivity } from '@/hooks/use-user-activity';

export function UserActivityTracker() {
  useUserActivity();
  return null; // This component doesn't render anything
}
