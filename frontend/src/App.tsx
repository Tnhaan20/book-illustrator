import { useState } from 'react'
import './App.css'

type Status = 'idle' | 'loading' | 'ok' | 'error'

interface HealthPayload {
  status: string
  message: string
  timestamp: string
  env: string
}

function App() {
  const [status, setStatus] = useState<Status>('idle')
  const [data, setData] = useState<HealthPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const baseUrl = import.meta.env.VITE_API_BASE_URL as string

  async function ping() {
    setStatus('loading')
    setData(null)
    setError(null)
    try {
      // Use the Vite proxy (/api → backend) so the browser never hits a
      // different origin — VITE_API_BASE_URL is a handy fallback for
      // non-proxied environments (e.g. production).
      const res = await fetch('/api/health')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as HealthPayload
      setData(json)
      setStatus('ok')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }

  const statusColor: Record<Status, string> = {
    idle: '#6b7280',
    loading: '#f59e0b',
    ok: '#10b981',
    error: '#ef4444',
  }

  const statusLabel: Record<Status, string> = {
    idle: '— not tested yet —',
    loading: 'Pinging backend…',
    ok: '✅ Connected',
    error: '❌ Failed',
  }

  return (
    <main id="connection-test" style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 560, margin: '80px auto', padding: '0 1rem' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 4 }}>📡 Backend Connection Test</h1>
      <p style={{ color: '#6b7280', marginBottom: 32 }}>
        Hits <code>/api/health</code> via Vite proxy → <code>{baseUrl}</code>
      </p>

      <div
        id="status-card"
        style={{
          border: `2px solid ${statusColor[status]}`,
          borderRadius: 12,
          padding: '24px 28px',
          marginBottom: 24,
          transition: 'border-color 0.3s',
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, color: statusColor[status], fontSize: '1.1rem' }}>
          {statusLabel[status]}
        </p>

        {status === 'ok' && data && (
          <table style={{ marginTop: 16, width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <tbody>
              {(Object.entries(data) as [string, string][]).map(([k, v]) => (
                <tr key={k}>
                  <td style={{ padding: '4px 8px 4px 0', color: '#9ca3af', width: 120 }}>{k}</td>
                  <td style={{ padding: '4px 0', fontFamily: 'monospace' }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {status === 'error' && (
          <p style={{ marginTop: 12, fontFamily: 'monospace', color: '#ef4444', fontSize: '0.85rem' }}>
            {error}
          </p>
        )}
      </div>

      <button
        id="ping-btn"
        type="button"
        onClick={ping}
        disabled={status === 'loading'}
        style={{
          padding: '10px 28px',
          borderRadius: 8,
          border: 'none',
          background: status === 'loading' ? '#374151' : '#4f46e5',
          color: '#fff',
          fontSize: '1rem',
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          transition: 'background 0.2s',
        }}
      >
        {status === 'loading' ? 'Pinging…' : 'Ping /health'}
      </button>
    </main>
  )
}

export default App
