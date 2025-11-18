'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold text-primary-600">
              TradingView Dashboard
            </Link>
            {session && (
              <Link
                href="/dashboard"
                className="ml-8 text-gray-700 hover:text-primary-600 transition"
              >
                Dashboard
              </Link>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {status === 'loading' && (
              <span className="text-sm text-gray-500">Loading...</span>
            )}

            {!session && status !== 'loading' && (
              <button
                onClick={() => signIn('google')}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition"
              >
                Sign in with Google
              </button>
            )}

            {session && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {session.user?.image && (
                    <img
                      src={session.user.image}
                      alt={session.user.name || 'User'}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <span className="text-sm text-gray-700">{session.user?.name}</span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="text-sm text-gray-600 hover:text-gray-900 transition"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
