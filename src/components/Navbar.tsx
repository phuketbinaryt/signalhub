import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-primary-600">
              TradingView Dashboard
            </Link>
            <Link
              href="/dashboard"
              className="ml-8 text-gray-700 hover:text-primary-600 transition"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
