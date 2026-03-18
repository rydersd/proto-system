// Cloudflare Pages Function — /api/reviews
// Binds to KV namespace: REVIEW_KV
//
// Routes:
//   GET    /api/reviews?page=optional  — list annotations (all or filtered by page)
//   POST   /api/reviews               — append a single annotation
//   DELETE /api/reviews?page=name      — clear annotations for a page

// ---------------------------------------------------------------------------
// CORS headers applied to every response
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

/** Wrap Response.json with CORS headers. */
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/** Plain-text error response with CORS headers. */
function errorResponse(message, status) {
  return new Response(message, { status, headers: CORS_HEADERS });
}

// ---------------------------------------------------------------------------
// OPTIONS — preflight
// ---------------------------------------------------------------------------
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// ---------------------------------------------------------------------------
// GET /api/reviews?page=optional-page-filter
// ---------------------------------------------------------------------------
export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const page = url.searchParams.get('page');
  const kv = context.env.REVIEW_KV;

  if (page) {
    const data = await kv.get('reviews:' + page, 'json');
    return jsonResponse(data || []);
  }

  // List all pages and return all annotations
  const list = await kv.list({ prefix: 'reviews:' });
  const all = {};
  for (const key of list.keys) {
    const pageName = key.name.replace('reviews:', '');
    all[pageName] = (await kv.get(key.name, 'json')) || [];
  }
  return jsonResponse(all);
}

// ---------------------------------------------------------------------------
// POST /api/reviews — body is a single annotation object
// ---------------------------------------------------------------------------
export async function onRequestPost(context) {
  let annotation;
  try {
    annotation = await context.request.json();
  } catch {
    return errorResponse('Invalid JSON body', 400);
  }

  if (!annotation || !annotation.page) {
    return errorResponse('Missing page field', 400);
  }

  const kv = context.env.REVIEW_KV;
  const key = 'reviews:' + annotation.page;

  // Stamp a server-side timestamp if the client didn't provide one
  if (!annotation.timestamp) {
    annotation.timestamp = new Date().toISOString();
  }

  const existing = (await kv.get(key, 'json')) || [];
  existing.push(annotation);
  await kv.put(key, JSON.stringify(existing));

  return jsonResponse({ ok: true, count: existing.length });
}

// ---------------------------------------------------------------------------
// DELETE /api/reviews?page=page-name — clear annotations for a page
// ---------------------------------------------------------------------------
export async function onRequestDelete(context) {
  const url = new URL(context.request.url);
  const page = url.searchParams.get('page');

  if (!page) {
    return errorResponse('Missing page parameter', 400);
  }

  const kv = context.env.REVIEW_KV;
  await kv.delete('reviews:' + page);
  return jsonResponse({ ok: true });
}
