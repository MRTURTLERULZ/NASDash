import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { logout } from "./actions";

export const metadata: Metadata = {
  title: "NAS Dashboard",
  description: "Local NAS file management dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html lang="en">
      <body className="antialiased" suppressHydrationWarning>
        {session && (
          <nav className="bg-gray-800 text-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between h-16">
                <div className="flex">
                  <Link
                    href="/"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium hover:bg-gray-700 rounded-md"
                  >
                    Home
                  </Link>
                  <Link
                    href="/files"
                    className="inline-flex items-center px-4 py-2 text-sm font-medium hover:bg-gray-700 rounded-md"
                  >
                    Files
                  </Link>
                </div>
                <div className="flex items-center">
                  <form action={logout}>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium hover:bg-gray-700 rounded-md"
                    >
                      Logout
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </nav>
        )}
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}

