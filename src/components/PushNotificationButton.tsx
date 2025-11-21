'use client';

import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from './ui/button';

export function PushNotificationButton() {
  const { isSupported, isSubscribed, loading, permission, subscribe, unsubscribe } =
    usePushNotifications();

  if (!isSupported) {
    return null; // Don't show button if not supported
  }

  const handleToggle = async () => {
    try {
      if (isSubscribed) {
        await unsubscribe();
      } else {
        await subscribe();
      }
    } catch (error) {
      alert('Failed to update notification settings. Please try again.');
    }
  };

  const getButtonText = () => {
    if (loading) return 'Loading...';
    if (isSubscribed) return 'Notifications On';
    if (permission === 'denied') return 'Notifications Blocked';
    return 'Enable Notifications';
  };

  const getIcon = () => {
    if (isSubscribed) {
      return <Bell className="w-4 h-4" />;
    }
    return <BellOff className="w-4 h-4" />;
  };

  return (
    <Button
      onClick={handleToggle}
      disabled={loading || permission === 'denied'}
      className={`gap-2 ${
        isSubscribed
          ? 'bg-success hover:bg-success/90'
          : 'bg-secondary hover:bg-secondary/80 border border-border'
      }`}
      title={permission === 'denied' ? 'Notifications blocked in browser settings' : ''}
    >
      {getIcon()}
      <span className="hidden sm:inline">{getButtonText()}</span>
    </Button>
  );
}
