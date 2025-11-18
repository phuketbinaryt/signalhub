import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            TradingView Webhook Dashboard
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-3xl mx-auto">
            Receive TradingView webhooks, store them in PostgreSQL, forward to multiple
            destinations, and view your trading performance in a beautiful dashboard.
          </p>

          <Link
            href="/dashboard"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition mb-12"
          >
            Go to Dashboard →
          </Link>

          <div className="bg-white rounded-lg shadow-xl p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-semibold mb-6 text-gray-800">Key Features</h2>

            <div className="grid md:grid-cols-3 gap-8 text-left">
              <div>
                <div className="text-3xl mb-3">📡</div>
                <h3 className="font-semibold text-lg mb-2">Webhook Receiver</h3>
                <p className="text-gray-600 text-sm">
                  Secure endpoint to receive TradingView alerts with secret validation
                </p>
              </div>

              <div>
                <div className="text-3xl mb-3">🔄</div>
                <h3 className="font-semibold text-lg mb-2">Multi-Destination</h3>
                <p className="text-gray-600 text-sm">
                  Automatically forward webhooks to Discord, Telegram, and custom endpoints
                </p>
              </div>

              <div>
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-semibold text-lg mb-2">Trading Dashboard</h3>
                <p className="text-gray-600 text-sm">
                  View P&L stats, win rate, and trade history grouped by ticker
                </p>
              </div>

              <div>
                <div className="text-3xl mb-3">🔐</div>
                <h3 className="font-semibold text-lg mb-2">Google Auth</h3>
                <p className="text-gray-600 text-sm">
                  Secure access to your dashboard with Google OAuth authentication
                </p>
              </div>

              <div>
                <div className="text-3xl mb-3">💾</div>
                <h3 className="font-semibold text-lg mb-2">PostgreSQL Storage</h3>
                <p className="text-gray-600 text-sm">
                  All trades and events stored reliably in PostgreSQL database
                </p>
              </div>

              <div>
                <div className="text-3xl mb-3">🚀</div>
                <h3 className="font-semibold text-lg mb-2">Render.com Ready</h3>
                <p className="text-gray-600 text-sm">
                  Deploy as a single web service on Render with one click
                </p>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-lg font-semibold mb-4">Webhook Endpoint</h3>
              <div className="bg-gray-100 rounded p-4 font-mono text-sm">
                POST https://your-domain.com/api/webhook
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Configure this URL in your TradingView alerts to start receiving trades
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
