import { useState, useEffect } from 'react'

/**
 * SharePage - displays a shared fortune result (pixelated avatar + annotated diagram + text).
 * Accessed via /share/{id} URL.
 */
export default function SharePage({ shareId }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchShare() {
      try {
        const resp = await fetch(`/api/share/${shareId}`)
        if (!resp.ok) {
          setError(resp.status === 404 ? '分享链接已失效或不存在' : '加载失败，请稍后再试')
          return
        }
        setData(await resp.json())
      } catch {
        setError('网络错误，请检查连接')
      } finally {
        setLoading(false)
      }
    }
    fetchShare()
  }, [shareId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] flex items-center justify-center">
        <div className="text-yellow-400 text-xl animate-pulse">加载中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-yellow-200 text-lg">{error}</p>
        <a
          href="/"
          className="text-yellow-400 underline hover:text-yellow-300 transition-colors"
        >
          去首页体验相面 →
        </a>
      </div>
    )
  }

  const fortune = data?.fortune || {}
  const hasImages = data?.pixelated_image || data?.annotated_image

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f23] to-[#1a1a2e] flex flex-col items-center p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-center w-full max-w-2xl gap-5 py-8">
        {/* Title */}
        <h1 className="text-2xl sm:text-3xl text-yellow-400 font-bold">
          ✨ 相面结果 ✨
        </h1>

        {/* Images */}
        {hasImages && (
          <div className="flex flex-row items-center gap-3 md:gap-5">
            {data.pixelated_image && (
              <div className="flex flex-col items-center gap-1">
                <img
                  src={data.pixelated_image}
                  alt="像素画像"
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-lg border-2 border-yellow-400/40 shadow-2xl"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="text-xs text-gray-500">像素画像</span>
              </div>
            )}
            {data.annotated_image && (
              <div className="flex flex-col items-center gap-1">
                <img
                  src={data.annotated_image}
                  alt="面相标注"
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-lg border-2 border-yellow-400/20 shadow-2xl object-cover"
                />
                <span className="text-xs text-gray-500">面相标注</span>
              </div>
            )}
          </div>
        )}

        {/* Fortune text */}
        <div className="text-center space-y-4 max-w-xl px-2">
          {fortune.face && (
            <p className="text-base sm:text-lg text-yellow-200 font-bold leading-relaxed">
              {fortune.face}
            </p>
          )}
          {fortune.career && (
            <p className="text-base sm:text-lg text-white font-bold leading-relaxed">
              {fortune.career}
            </p>
          )}
          {fortune.blessing && (
            <p className="text-lg sm:text-xl text-red-400 font-bold leading-relaxed">
              🎊 {fortune.blessing} 🎊
            </p>
          )}
        </div>

        {/* CTA */}
        <a
          href="/"
          className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-lg font-bold rounded-xl shadow-xl transition-all duration-200 hover:scale-105"
        >
          我也要相面 →
        </a>

        {/* Footer */}
        <p className="text-xs text-gray-600 mt-4">
          Powered by Superlinear Academy · 马年大吉
        </p>
      </div>
    </div>
  )
}
