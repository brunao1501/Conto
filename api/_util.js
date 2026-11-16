const ALLOWED = [/^conto-bgtech\.vercel\.app$/, /^conto-[a-z0-9-]+-bruno-psantos-7991\.vercel\.app$/, /^localhost(:\d+)?$/];
export function origemOk(request) {
  const o = request.headers.get('origin') || request.headers.get('referer') || '';
  try { const h = new URL(o).host; return ALLOWED.some(r => r.test(h)); } catch { return false; }
}
export const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
