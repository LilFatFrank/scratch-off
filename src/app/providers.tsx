'use client';

import { MiniAppProvider } from '@neynar/react';
import { ANALYTICS_ENABLED } from '~/lib/constants';

export function Providers({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
      <MiniAppProvider
        analyticsEnabled={ANALYTICS_ENABLED}
        backButtonEnabled={true}
      >
        {children}
      </MiniAppProvider>
  );
}
