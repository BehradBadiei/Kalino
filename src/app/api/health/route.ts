export const dynamic = "force-dynamic";

// This app currently stores user data in the browser via IndexedDB.
// Keep the health endpoint independent of PostgreSQL so builds do not
// require DATABASE_URL unless a server-side database is actually added.
export async function GET() {
  return Response.json({ ok: true, storage: "browser" });
}
