import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function identifyProduct(imageBase64, mediaType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chave da API do Gemini não configurada. Adicione GEMINI_API_KEY nas variáveis de ambiente do projeto (é grátis, veja o README)."
    );
  }

  const prompt = `Identifique o produto nesta foto para uma comparação de preços em um marketplace brasileiro.
Responda APENAS com um JSON válido, sem markdown, sem texto antes ou depois, exatamente neste formato:
{"name": "nome curto e claro do produto", "brand": "marca visível na embalagem, ou 'não identificada'", "category": "categoria geral do produto", "search_query": "3 a 5 palavras genéricas em português para buscar este produto OU equivalentes de outras marcas em um marketplace, sem incluir a marca"}`;

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { inline_data: { mime_type: mediaType, data: imageBase64 } },
              { text: prompt },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao identificar o produto (Gemini): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();

  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Não conseguimos entender a resposta de identificação do produto. Tente outra foto.");
  }

  if (!parsed.search_query) {
    throw new Error("Não conseguimos identificar esse produto com confiança suficiente.");
  }

  return parsed;
}

async function searchPrices(query) {
  const url = `https://api.mercadolibre.com/sites/MLB/search?q=${encodeURIComponent(query)}&limit=25`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PrecoCertoApp/1.0; +https://vercel.app)",
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(
      `Erro ao buscar preços no Mercado Livre (status ${response.status}): ${errText.slice(0, 200)}`
    );
  }
  const data = await response.json();
  const results = (data.results || [])
    .filter((r) => typeof r.price === "number" && r.price > 0)
    .map((r) => ({
      title: r.title,
      price: r.price,
      permalink: r.permalink,
      seller: r.seller?.nickname || null,
      thumbnail: r.thumbnail,
    }));
  return results;
}

function computeStats(results, priceCharged) {
  if (results.length === 0) {
    return { marketAvg: 0, alternatives: [] };
  }
  const prices = results.map((r) => r.price).sort((a, b) => a - b);
  // média aparada: descarta 10% mais caro e 10% mais barato para reduzir efeito de outliers
  const trimCount = Math.floor(prices.length * 0.1);
  const trimmed = prices.slice(trimCount, prices.length - trimCount || prices.length);
  const base = trimmed.length ? trimmed : prices;
  const marketAvg = base.reduce((sum, p) => sum + p, 0) / base.length;

  const alternatives = [...results]
    .sort((a, b) => a.price - b.price)
    .slice(0, 5);

  return { marketAvg, alternatives };
}

export async function POST(req) {
  try {
    const { imageBase64, mediaType, priceCharged } = await req.json();

    if (!imageBase64 || !priceCharged) {
      return NextResponse.json({ error: "Foto e preço são obrigatórios." }, { status: 400 });
    }

    const product = await identifyProduct(imageBase64, mediaType || "image/jpeg");
    const results = await searchPrices(product.search_query);
    const { marketAvg, alternatives } = computeStats(results, priceCharged);

    return NextResponse.json({
      product,
      marketAvg,
      alternatives,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Erro inesperado." }, { status: 500 });
  }
}
