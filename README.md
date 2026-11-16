# Contô 🛒

**👉 Acesse o app: [conto-bgtech.vercel.app](https://conto-bgtech.vercel.app)**

App web (PWA) para somar as compras no mercado e ver, em tempo real, quanto ainda cabe no limite do dinheiro/Pix e do cartão.

Uma criação **BGTech Consulting**.

## Funções
- Bolha animada com o valor que ainda cabe no limite
- Limites separados: Dinheiro/Pix e Cartão
- Modo família: limite por categoria (Comida, Limpeza, Higiene, Outros)
- Mostra se o próximo item cabe antes de adicionar
- Leitura do preço pela câmera
- Listas de compra prontas e envio pelo WhatsApp
- Histórico com comparação entre compras e entre meses
- Funciona offline e pode ser instalado na tela inicial

## Como instalar no celular
Abra o link → menu do navegador → **Adicionar à tela inicial**.

## Tecnologia
HTML, CSS e JavaScript puros, sem build. Deploy automático na Vercel a cada push na branch `main`.

## Assistente de IA e cupom fiscal
- `api/assistente.js` — assistente via Vercel AI Gateway (Claude Haiku 5.5). Usa só os dados do usuário; não inventa preços.
- `api/nfce.js` — lê o link do QR code da NFC-e e busca produtos/preços na consulta pública da Sefaz (função na região São Paulo, `gru1`).
