import { origemOk, json } from './_util.js';

// Só consulta páginas públicas da Sefaz (domínios .gov.br de fazenda/sefaz/nfce)
const hostOk = h => /\.gov\.br$/i.test(h) && /(fazenda|sefaz|nfce|sef|set|sefin)/i.test(h);

const dec = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&([a-z]+);/gi, (m, n) => ({ aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', atilde: 'ã', otilde: 'õ', ccedil: 'ç', acirc: 'â', ecirc: 'ê', ocirc: 'ô', Aacute: 'Á', Eacute: 'É', Ccedil: 'Ç', Atilde: 'Ã', quot: '"', lt: '<', gt: '>' }[n] || m));
const txt = s => dec(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const num = s => { s = String(s || '').replace(/[^\d,.-]/g, ''); if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); const n = parseFloat(s); return isNaN(n) ? 0 : n; };

export function parseNfce(html) {
  const itens = [];
  const rows = html.split(/<tr[^>]*id="Item\s*\+?\s*\d+"[^>]*>/i).slice(1);
  for (const row of rows) {
    const nome = txt((row.match(/class="txtTit2?"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]);
    const qtd = num(txt((row.match(/class="Rqtd"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]).replace(/Qtde\.?:?/i, ''));
    const un = txt((row.match(/class="RUN"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]).replace(/UN:?/i, '').trim();
    const vu = num(txt((row.match(/class="RvlUnit"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]).replace(/Vl\.?\s*Unit\.?:?/i, ''));
    const vt = num(txt((row.match(/class="valor"[^>]*>([\s\S]*?)<\/span>/i) || [])[1]));
    if (nome && (vu || vt)) itens.push({ nome, qtd: qtd || 1, un, unit: vu || (vt / (qtd || 1)), total: vt || vu * (qtd || 1) });
  }
  const loja = txt((html.match(/id="u20"[^>]*>([\s\S]*?)<\/div>/i) || [])[1]) || txt((html.match(/class="txtTopo"[^>]*>([\s\S]*?)<\/div>/i) || [])[1]);
  const em = html.match(/Emiss[ãa]o:?\s*<\/strong>\s*(\d{2}\/\d{2}\/\d{4})/i) || html.match(/(\d{2}\/\d{2}\/\d{4})\s+\d{2}:\d{2}:\d{2}/);
  const tot = html.match(/Valor a pagar R\$:?\s*<\/label>\s*<span[^>]*>([\d.,]+)/i) || html.match(/class="totalNumb txtMax"[^>]*>([\d.,]+)/i);
  const total = tot ? num(tot[1]) : itens.reduce((a, i) => a + i.total, 0);
  return { loja, data: em ? em[1] : null, total, itens };
}

export async function POST(request) {
  if (!origemOk(request)) return json({ erro: 'origem não permitida' }, 403);
  let url;
  try { url = new URL(String((await request.json()).url || '').trim()); } catch { return json({ erro: 'Link do cupom inválido' }, 400); }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return json({ erro: 'Link inválido' }, 400);
  if (!hostOk(url.hostname)) return json({ erro: 'Esse QR code não é de um cupom fiscal (NFC-e)' }, 400);

  let atual = url, html = '';
  try {
    for (let i = 0; i < 5; i++) {
      const r = await fetch(atual, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148', 'Accept-Language': 'pt-BR' }, signal: AbortSignal.timeout(15000) });
      if (r.status >= 300 && r.status < 400 && r.headers.get('location')) {
        atual = new URL(r.headers.get('location'), atual);
        if (!hostOk(atual.hostname)) return json({ erro: 'Redirecionamento inesperado' }, 400);
        continue;
      }
      if (!r.ok) return json({ erro: `A Sefaz respondeu com erro (${r.status}). Tente de novo em alguns minutos.` }, 502);
      html = await r.text();
      break;
    }
  } catch (e) {
    console.error('nfce fetch', e?.message);
    return json({ erro: 'Não consegui acessar a Sefaz agora. Tente de novo em alguns minutos.' }, 502);
  }
  const nota = parseNfce(html);
  if (!nota.itens.length) {
    console.error('nfce parse vazio', atual.hostname, html.slice(0, 300));
    return json({ erro: 'Não encontrei os produtos nesse cupom. O formato do seu estado pode ser diferente — me avise!' }, 422);
  }
  return json(nota);
}
