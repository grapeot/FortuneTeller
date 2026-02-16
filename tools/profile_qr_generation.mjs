#!/usr/bin/env node
import QRCode from 'qrcode'

function parseArgs(argv) {
  const args = {
    baseUrl: 'https://xiangmian.ai-builders.space',
    runs: 10,
    warmup: 1,
    includeViz: true,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--base-url') args.baseUrl = argv[++i]
    else if (a === '--runs') args.runs = Number(argv[++i] || args.runs)
    else if (a === '--warmup') args.warmup = Number(argv[++i] || args.warmup)
    else if (a === '--no-viz') args.includeViz = false
  }
  return args
}

function makeVisualizationData() {
  const landmarks = Array.from({ length: 478 }, (_, i) => {
    const x = 0.35 + (i % 21) * 0.015
    const y = 0.18 + (i % 17) * 0.02
    return [Number(x.toFixed(4)), Number(y.toFixed(4))]
  })

  return {
    landmarks,
    contour_indices: {
      face_oval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152],
    },
    measurements: {
      three_parts: [0.33, 0.34, 0.33],
      yintang_width: 0.71,
    },
  }
}

function makePayload(includeViz) {
  const tinyPng =
    'iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAIAAADTED8xAAAACXBIWXMAAAsSAAALEgHS3X78AAAA'

  return {
    pixelated_image: `data:image/png;base64,${tinyPng}`,
    visualization_data: includeViz ? makeVisualizationData() : null,
    fortunes: {
      gemini: null,
      grok: {
        face: '山根高耸，鼻梁挺直——',
        career: '颧骨有力，适合带队攻坚。',
        blessing: '一马当先！',
      },
    },
  }
}

function summarize(values) {
  const sorted = [...values].sort((a, b) => a - b)
  const pick = (p) => {
    if (sorted.length === 0) return 0
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)))
    return sorted[idx]
  }
  const avg = sorted.reduce((s, v) => s + v, 0) / (sorted.length || 1)
  return {
    min: Number((sorted[0] || 0).toFixed(2)),
    p50: Number(pick(0.5).toFixed(2)),
    p95: Number(pick(0.95).toFixed(2)),
    max: Number((sorted[sorted.length - 1] || 0).toFixed(2)),
    avg: Number(avg.toFixed(2)),
  }
}

async function profileOne(baseUrl, payload) {
  const apiStart = performance.now()
  const resp = await fetch(`${baseUrl}/api/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const apiEnd = performance.now()

  const apiMs = apiEnd - apiStart
  if (!resp.ok) {
    const errorText = await resp.text()
    return {
      ok: false,
      status: resp.status,
      apiMs,
      qrMs: 0,
      totalMs: apiMs,
      id: null,
      error: errorText.slice(0, 200),
    }
  }

  const data = await resp.json()
  const shareUrl = `${baseUrl}/share/${data.id}`

  const qrStart = performance.now()
  await QRCode.toDataURL(shareUrl, { width: 200, margin: 2 })
  const qrEnd = performance.now()

  return {
    ok: true,
    status: resp.status,
    apiMs,
    qrMs: qrEnd - qrStart,
    totalMs: qrEnd - apiStart,
    id: data.id,
    error: null,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const payload = makePayload(args.includeViz)
  const payloadBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8')

  console.log(`baseUrl=${args.baseUrl}`)
  console.log(`runs=${args.runs}, warmup=${args.warmup}, includeViz=${args.includeViz}`)
  console.log(`payloadBytes=${payloadBytes}`)

  for (let i = 0; i < args.warmup; i += 1) {
    await profileOne(args.baseUrl, payload)
  }

  const samples = []
  for (let i = 0; i < args.runs; i += 1) {
    const r = await profileOne(args.baseUrl, payload)
    samples.push(r)
    console.log(
      `[${i + 1}/${args.runs}] ok=${r.ok} status=${r.status} api=${r.apiMs.toFixed(1)}ms qr=${r.qrMs.toFixed(1)}ms total=${r.totalMs.toFixed(1)}ms id=${r.id || '-'}${r.error ? ` err=${r.error}` : ''}`,
    )
  }

  const ok = samples.filter((s) => s.ok)
  const failed = samples.length - ok.length
  const apiStats = summarize(ok.map((s) => s.apiMs))
  const qrStats = summarize(ok.map((s) => s.qrMs))
  const totalStats = summarize(ok.map((s) => s.totalMs))

  console.log('\nSummary')
  console.log(JSON.stringify({ totalRuns: samples.length, failed, apiStats, qrStats, totalStats }, null, 2))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
