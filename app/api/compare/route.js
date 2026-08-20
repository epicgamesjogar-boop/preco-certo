import { NextResponse } from "next/server";

export const runtime = "nodejs";

async function analyzeProduct(imageBase64, mediaType) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Chave da API do Gemini não configurada. Adicione GEMINI_API_KEY nas variáveis de ambiente do projeto (é grátis, veja o README)."
    );
  }

  const prompt = `Você é um assistente de comparação de preços no Brasil.
1. Identifique o produto nesta foto (nome, marca, categoria).
2. Pesquise na web preços atuais desse produto e de 3 a 5 produtos equivalentes (mesma função, marcas diferentes) sendo vendidos no Brasil agora, em lojas ou marketplaces reais.
3. Com base no que encontrar, calcule uma média de mercado aproximada.

Responda APENAS com um JSON válido, sem markdown, sem texto antes ou depois, exatamente neste formato:
{"product": {"name": "nome curto do produto", "brand": "marca, ou 'não identificada'", "category": "categoria geral"}, "market_avg": 00.00, "alternatives": [{"title": "nome do produto/oferta encontrada", "price": 00.00, "store": "nome da loja ou site", "url": "link direto da oferta se encontrado, senão null"}]}`;

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
        tools: [{ google_search: {} }],
      }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro ao analisar o produto (Gemini): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();

  // A busca do Google às vezes faz o modelo acrescentar texto antes/depois do JSON,
  // então extraímos apenas o trecho entre a primeira { e a última }.
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("Não conseguimos entender a resposta da análise. Tente outra foto.");
  }
  const cleaned = text.slice(start, end + 1);

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error("Não conseguimos entender a resposta da análise. Tente outra foto.");
  }

  if (!parsed.product || !parsed.product.name) {
    throw new Error("Não conseguimos identificar esse produto com confiança suficiente.");
  }

  return parsed;
}

export async function POST(req) {
  try {
    const { imageBase64, mediaType, priceCharged } = await req.json();

    if (!imageBase64 || !priceCharged) {
      return NextResponse.json({ error: "Foto e preço são obrigatórios." }, { status: 400 });
    }

    const analysis = await analyzeProduct(imageBase64, mediaType || "image/jpeg");

    const alternatives = (analysis.alternatives || [])
      .filter((a) => typeof a.price === "number" && a.price > 0)
      .sort((a, b) => a.price - b.price)
      .slice(0, 5)
      .map((a) => ({
        title: a.title,
        price: a.price,
        permalink: a.url || null,
        seller: a.store || null,
      }));

    return NextResponse.json({
      product: analysis.product,
      marketAvg: typeof analysis.market_avg === "number" ? analysis.market_avg : 0,
      alternatives,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "Erro inesperado." }, { status: 500 });
  }
}
