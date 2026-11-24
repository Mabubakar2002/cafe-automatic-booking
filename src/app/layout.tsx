import './globals.css'
import type { Metadata, Viewport } from 'next'

const name = process.env.NEXT_PUBLIC_CAFE_NAME || 'The Grand Artisan Cafe'

export const metadata: Metadata = { title: name, manifest: '/manifest.json' }
export const viewport: Viewport = { themeColor: '#E5412D' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;800&family=DM+Sans:wght@400;500;700&display=swap"
        />
        {/* Suppress third-party Chrome extensions (e.g., Emily AI, Grammarly) from crashing Next.js dev overlay */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function isExtensionError(val) {
                  if (!val) return false;
                  var str = typeof val === 'string' ? val : (val.stack || val.message || '');
                  return str.indexOf('chrome-extension://') !== -1 ||
                         str.indexOf('moz-extension://') !== -1 ||
                         str.indexOf('embed_script.js') !== -1 ||
                         str.indexOf('oihbmmeelledioenpfcfehdjhdnlfibj') !== -1;
                }
                window.addEventListener('error', function(event) {
                  if (isExtensionError(event.filename) || isExtensionError(event.message) || isExtensionError(event.error)) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                  }
                }, true);
                window.addEventListener('unhandledrejection', function(event) {
                  if (isExtensionError(event.reason)) {
                    event.stopImmediatePropagation();
                    event.preventDefault();
                  }
                }, true);
              })();
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
