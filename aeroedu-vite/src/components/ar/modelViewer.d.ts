/**
 * Khai báo JSX cho custom element <model-viewer> (Google model-viewer, nạp qua CDN).
 */
import type { DetailedHTMLProps, HTMLAttributes } from 'react'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string
        'ios-src'?: string
        ar?: boolean
        'ar-modes'?: string
        'ar-scale'?: string
        'ar-placement'?: string
        'camera-controls'?: boolean
        'auto-rotate'?: boolean
        'shadow-intensity'?: string
        'environment-image'?: string
        exposure?: string
        poster?: string
        alt?: string
        loading?: string
        reveal?: string
      }
    }
  }
}

export {}
