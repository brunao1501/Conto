import { origemOk, json } from './_util.js';

const MODEL = 'anthropic/claude-haiku-5.5';

const SYSTEM = `Você é a Contô, assistente de compras do app Contô (uma criação BGTech Consulting).
Ajuda a pessoa a fazer compras de mercado dentro do limite de gasto.

Regras:
- Responda em português do Brasil, curto e direto (no máximo ~6 linhas ou uma lista curta). Tom simpático, pode usar 1 emoji.
- Use SOMENTE os preços que estão no CONTEXTO (carrinho, listas e histórico de preços da própria pessoa). NUNCA invente preços, mercados ou promoções.
- Se não houver preço no histórico para um produto, diga que ainda não tem esse preço e sugira ler o cupom fiscal (botão 🧾) depois da compra.
- Ao sugerir o que tirar para caber no limite, priorize itens supérfluos e mostre a conta.
- Pode sugerir trocas genéricas (ex.: marca própria, embalagem maior) deixando claro que é uma dica, sem afirmar preços.
- Não dê conselhos financeiros além de compras do dia a dia.`;

export async function POST(request) {
  if (!origemOk(request)) return json({ erro: 'origem não permitida' }, 403);
  let body;
  try { body = await request.json(); } catch { return json({ erro: 'JSON inválido' }, 400); }
  const contexto = String(body.contexto || '').slice(0, 12000);
  const msgs = Array.isArray(body.mensagens) ? body.mensagens.slice(-10) : [];
  const mensagens = msgs
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map(m => ({ role: m.role, content: m.content.slice(0, 1000) }));
  if (!mensagens.length || mensagens[mensagens.length - 1].role !== 'user') return json({ erro: 'sem pergunta' }, 400);

  const key = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
  if (!key) return json({ erro: 'IA não configurada' }, 500);

  const r = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      temperature: 0.4,
      messages: [{ role: 'system', content: SYSTEM + '\n\nCONTEXTO ATUAL:\n' + contexto }, ...mensagens],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    console.error('gateway', r.status, t.slice(0, 500));
    return json({ erro: r.status === 402 ? 'Créditos de IA esgotados' : 'Falha na IA' }, 502);
  }
  const data = await r.json();
  return json({ resposta: data?.choices?.[0]?.message?.content || '' });
}
