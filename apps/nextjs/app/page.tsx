export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Upfirst - Next.js 14</h1>
      <p className="mt-4 text-lg text-gray-600">
        CTO Vision: Modern stack with Next.js App Router
      </p>
      <p className="mt-2 text-sm text-gray-500">
        ✅ Material UI + Apollo GraphQL configured
      </p>
      <div className="mt-8 flex flex-wrap gap-4 items-center justify-center">
        <a
          href="/login"
          className="rounded-lg bg-gray-900 text-white px-8 py-4 hover:bg-gray-800 font-semibold text-lg shadow-lg transition-colors"
          data-testid="link-login"
        >
          Login / Sign Up
        </a>
        <a
          href="/dashboard"
          className="rounded-lg border border-gray-300 bg-blue-500 text-white px-6 py-3 hover:bg-blue-600 font-semibold"
        >
          Dashboard (MUI + GraphQL) →
        </a>
        <a
          href="http://localhost:4000/graphql"
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100"
        >
          GraphQL API →
        </a>
        <a
          href="http://localhost:5000"
          className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100"
        >
          Vite Frontend →
        </a>
      </div>
    </main>
  );
}
