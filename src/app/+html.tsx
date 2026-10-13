import { ScrollViewStyleReset } from 'expo-router/html';
import { type PropsWithChildren } from 'react';

// Web only: paint the page with the theme background before any JavaScript runs, so dark-mode
// users never see a white page while the app loads or between screens. Colors match constants/theme.ts.
const BACKGROUND_CSS = `
html, body, #root { background-color: #F7F7FB; }
@media (prefers-color-scheme: dark) {
  html, body, #root { background-color: #0B0B12; }
}
`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="light dark" />
        <title>BrightPath</title>
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: BACKGROUND_CSS }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
