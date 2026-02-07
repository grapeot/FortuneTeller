import { useState, useRef, useEffect } from 'react'
import QRCode from 'qrcode'

const QR_URL = 'https://fortune-teller.ai-builders.space/'

/**
 * QRCodeIcon - shows a QR code icon, displays QR code on hover
 */
export default function QRCodeIcon() {
  const [showQR, setShowQR] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    // Generate QR code once
    if (!qrDataUrl) {
      QRCode.toDataURL(QR_URL, { width: 200, margin: 2 })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR generation failed:', err))
    }
  }, [qrDataUrl])

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowQR(true)}
      onMouseLeave={() => setShowQR(false)}
    >
      {/* QR Code Icon */}
      <svg
        className="w-6 h-6 text-gray-500 hover:text-gray-300 transition-colors opacity-60 hover:opacity-90 cursor-pointer"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
        />
      </svg>

      {/* QR Code Popup */}
      {showQR && qrDataUrl && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-white rounded-lg shadow-2xl z-50">
          <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
          <p className="text-xs text-gray-600 mt-2 text-center">扫码访问</p>
        </div>
      )}
    </div>
  )
}
