/*
 * Copyright (c) 2025 GALAX Civic Networking App
 * 
 * This software is licensed under the PolyForm Shield License 1.0.0.
 * For the full license text, see LICENSE file in the root directory 
 * or visit https://polyformproject.org/licenses/shield/1.0.0
 */

import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, HandHeart, AlertTriangle, Vote, User } from '@/lib/icons';
import { Button } from '@/components/ui/button';

// Lazy load motion for better initial performance
const motion = React.lazy(() => 
  import('framer-motion').then(module => ({ default: module.motion }))
);

// Memoized navigation item component for better performance
const NavigationItem = React.memo(({ 
  item, 
  isActive, 
  onClick, 
  index, 
  focusedIndex, 
  onFocus 
}: {
  item: any;
  isActive: boolean;
  onClick: () => void;
  index: number;
  focusedIndex: number;
  onFocus: (index: number) => void;
}) => {
  const Icon = item.icon;
  
  return (
    <Button
      key={item.path}
      variant="ghost"
      size="sm"
      onClick={onClick}
      onFocus={() => onFocus(index)}
      onBlur={() => onFocus(-1)}
      className={`flex-1 flex flex-col items-center justify-center py-1 px-1 h-14 transition-all duration-200 ${
        isActive 
          ? 'text-blue-600 bg-blue-50 scale-95' 
          : 'text-gray-600 hover:text-blue-500 hover:bg-blue-25'
      } ${focusedIndex === index ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}
      aria-label={item.ariaLabel}
      title={item.description}
    >
      <Icon className={`h-5 w-5 mb-0.5 transition-transform duration-200 ${
        isActive ? 'scale-110 text-blue-600' : ''
      }`} />
      <span className={`text-xs transition-all duration-200 ${
        isActive ? 'font-medium text-blue-600' : 'font-normal'
      }`}>
        {item.label}
      </span>
    </Button>
  );
});

NavigationItem.displayName = 'NavigationItem';

// Memoized main component for better performance
export const BottomNavigation = React.memo(() => {
  const navigate = useNavigate();
  const location = useLocation();
  const [focusedIndex, setFocusedIndex] = React.useState<number>(-1);

  // Memoize navigation items to prevent recreation on each render
  const navItems = React.useMemo(() => [
    { 
      path: '/dashboard', 
      icon: Home, 
      label: 'Dashboard',
      ariaLabel: 'Navigate to main dashboard',
      description: 'Access your personalized community dashboard'
    },
    { 
      path: '/help', 
      icon: HandHeart, 
      label: 'Requests',
      ariaLabel: 'Navigate to help requests section',
      description: 'Browse and manage help requests'
    },
    { 
      path: '/crisis', 
      icon: AlertTriangle, 
      label: 'Crisis',
      ariaLabel: 'Navigate to crisis alerts section',
      description: 'View and report emergency situations'
    },
    { 
      path: '/governance', 
      icon: Vote, 
      label: 'Gov',
      ariaLabel: 'Navigate to governance section',
      description: 'Participate in community governance and voting'
    },
    { 
      path: '/profile', 
      icon: User, 
      label: 'Profile',
      ariaLabel: 'Navigate to your profile page',
      description: 'View and edit your user profile'
    },
  ], []);

  // Memoize navigation handler
  const handleNavigation = React.useCallback((path: string) => {
    navigate(path);
  }, [navigate]);

  // Memoize current path for performance
  const currentPath = location.pathname;

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-purple-200 galax-glass z-50"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="flex justify-around items-center py-2 px-4">
        {navItems.map((item, index) => {
          const isActive = currentPath === item.path;
          
          return (
            <NavigationItem
              key={item.path}
              item={item}
              isActive={isActive}
              onClick={() => handleNavigation(item.path)}
              index={index}
              focusedIndex={focusedIndex}
              onFocus={setFocusedIndex}
            />
          );
        })}
      </div>
    </nav>
  );
});

BottomNavigation.displayName = 'BottomNavigation';
