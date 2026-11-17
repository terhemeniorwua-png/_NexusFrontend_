import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PITERON',
    short_name: 'PITERON',
    description: 'One connected workspace for projects, people, and progress.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#0F1117',
    theme_color: '#0F1117',
    icons: [
      {
        src: '/images/logo.jpg',
        sizes: '192x192',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/images/logo.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'any',
      },
      {
        src: '/images/logo.jpg',
        sizes: '512x512',
        type: 'image/jpeg',
        purpose: 'maskable',
      },
    ],
  };
}
