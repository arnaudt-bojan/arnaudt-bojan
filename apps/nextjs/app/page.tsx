export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">Upfirst - Next.js 14</h1>
      <p className="mt-4 text-lg text-gray-600">
        CTO Vision: Modern stack with Next.js App Router
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/api/graphql"
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
