"use client";

import { useRef, useState } from "react";

function currency(v) {
  if (typeof v !== "number" || Number.isNaN(v)) return "—";
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [screen, setScreen] = useState("capture"); // capture | scanning | result | error
  const [photo, setPhoto] = useState(null); // { file, previewUrl, base64, mediaType }
  const [price, setPrice] = useState("");
  const [mode, setMode] = useState("basico");
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef(null);

  const handlePickPhoto = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    const base64 = await fileToBase64(file);
    setPhoto({ file, previewUrl, base64, mediaType: file.type || "image/jpeg" });
  };

  const handleCompare = async () => {
    if (!photo || !price) return;
    setScreen("scanning");
    setErrorMsg("");
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: photo.base64,
          mediaType: photo.mediaType,
          priceCharged: parseFloat(price.replace(",", ".")),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao comparar preço.");
      setResult(data);
      setScreen("result");
    } catch (err) {
      setErrorMsg(err.message || "Algo deu errado.");
      setScreen("error");
    }
  };

  const reset = () => {
    setScreen("capture");
    setPhoto(null);
    setPrice("");
    setResult(null);
    setErrorMsg("");
  };

  return (
    <div className="screen">
      <div className="status-bar">
        <span>Preço Certo</span>
      </div>

      {screen === "capture" && (
        <CaptureScreen
          photo={photo}
          price={price}
          setPrice={setPrice}
          onPickPhoto={handlePickPhoto}
          onCompare={handleCompare}
          fileInputRef={fileInputRef}
          onFileChange={handleFileChange}
        />
      )}

      {screen === "scanning" && <ScanningScreen previewUrl={photo?.previewUrl} />}

      {screen === "error" && (
        <div className="scan-wrap">
          <div className="error-box">{errorMsg}</div>
          <button className="btn-ghost" onClick={reset} style={{ maxWidth: 240 }}>
            Tentar de novo
          </button>
        </div>
      )}

      {screen === "result" && result && (
        <ResultScreen
          result={result}
          priceCharged={parseFloat(price.replace(",", "."))}
          mode={mode}
          setMode={setMode}
          onBack={reset}
        />
      )}
    </div>
  );
}

function CaptureScreen({ photo, price, setPrice, onPickPhoto, onCompare, fileInputRef, onFileChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <div className="section" style={{ paddingBottom: 8 }}>
        <p className="eyebrow">PREÇO CERTO</p>
        <h1 className="title">
          Aponte, fotografe,
          <br />
          compare.
        </h1>
      </div>

      <div className="viewfinder" onClick={onPickPhoto} style={{ cursor: "pointer" }}>
        {photo ? (
          <img src={photo.previewUrl} alt="Produto fotografado" />
        ) : (
          <div style={{ textAlign: "center", color: "var(--neutral)" }}>
            <p className="mono" style={{ fontSize: 13 }}>toque para tirar a foto</p>
          </div>
        )}
        <div className="corner" style={{ top: 12, left: 12, borderTop: "2px solid", borderLeft: "2px solid" }} />
        <div className="corner" style={{ top: 12, right: 12, borderTop: "2px solid", borderRight: "2px solid" }} />
        <div className="corner" style={{ bottom: 12, left: 12, borderBottom: "2px solid", borderLeft: "2px solid" }} />
        <div className="corner" style={{ bottom: 12, right: 12, borderBottom: "2px solid", borderRight: "2px solid" }} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={onFileChange}
      />

      <div className="price-row">
        <p className="price-label mono">QUANTO ESTÁ COBRANDO NESTA LOJA?</p>
        <div className="price-input-box">
          <span>R$</span>
          <input
            type="text"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0,00"
          />
        </div>
      </div>

      <div className="bottom-actions">
        {!photo && (
          <button className="btn-primary" onClick={onPickPhoto}>
            TIRAR FOTO DO PRODUTO
          </button>
        )}
        {photo && (
          <button className="btn-primary" onClick={onCompare} disabled={!price}>
            COMPARAR PREÇO
          </button>
        )}
        {photo && (
          <button className="btn-ghost" onClick={onPickPhoto}>
            Tirar outra foto
          </button>
        )}
      </div>
    </div>
  );
}

function ScanningScreen({ previewUrl }) {
  return (
    <div className="scan-wrap">
      <div className="scan-frame">
        {previewUrl && <img src={previewUrl} alt="" />}
        <div className="scan-line" />
      </div>
      <p className="spinner-text">Identificando o produto e buscando preços…</p>
    </div>
  );
}

function verdictFor(price, marketAvg) {
  if (!marketAvg || marketAvg <= 0) {
    return { label: "SEM DADOS SUFICIENTES", tone: "neutral", diff: 0 };
  }
  const diff = ((price - marketAvg) / marketAvg) * 100;
  if (diff > 15) return { label: "PREÇO ACIMA DA MÉDIA", tone: "bad", diff };
  if (diff < -10) return { label: "BOM PREÇO", tone: "good", diff };
  return { label: "PREÇO NA MÉDIA", tone: "neutral", diff };
}

function ResultScreen({ result, priceCharged, mode, setMode, onBack }) {
  const { product, marketAvg, alternatives } = result;
  const v = verdictFor(priceCharged, marketAvg);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="header-bar">
        <button className="back-btn" onClick={onBack}>‹ voltar</button>
        <div className="mode-toggle">
          <button className={mode === "basico" ? "active" : ""} onClick={() => setMode("basico")}>
            BÁSICO
          </button>
          <button className={mode === "plus" ? "active" : ""} onClick={() => setMode("plus")}>
            ✦ PLUS
          </button>
        </div>
      </div>

      <div className="result-scroll">
        <div className="receipt-card">
          <div className="receipt-head">
            <p className="tiny mono">PRODUTO IDENTIFICADO</p>
            <p className="pname">{product.name}</p>
            <p className="pmeta">
              {product.brand} · {product.category}
            </p>
          </div>

          <div className="price-compare">
            <div>
              <p className="lbl">VALOR NA LOJA</p>
              <p className="val">{currency(priceCharged)}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p className="lbl">MÉDIA DE MERCADO</p>
              <p className="val" style={{ fontSize: 18, color: "var(--neutral)" }}>
                {currency(marketAvg)}
              </p>
            </div>
          </div>

          <span className={`badge ${v.tone}`}>
            {v.label}
            {marketAvg > 0 && ` (${v.diff > 0 ? "+" : ""}${v.diff.toFixed(0)}%)`}
          </span>

          {mode === "basico" && (
            <p className="verdict-note">
              {v.tone === "bad" &&
                "Encontramos opções mais em conta para o mesmo tipo de produto. Vale dar uma olhada antes de fechar a compra."}
              {v.tone === "good" && "Preço competitivo. Não achamos alternativas melhores que valham a troca."}
              {v.tone === "neutral" &&
                "Preço dentro do esperado para esse tipo de produto no mercado."}
            </p>
          )}
        </div>

        {mode === "plus" && (
          <div className="plus-block">
            <p className="heading mono">POR QUE ESSE VEREDITO?</p>
            <p className="explain">
              Comparamos o valor cobrado com {alternatives.length} anúncios de produtos equivalentes
              encontrados agora no Mercado Livre para "{product.search_query}".
              {v.tone === "bad" &&
                " O valor está acima da média porque existem opções com função equivalente custando menos."}
              {v.tone === "good" &&
                " O valor está dentro ou abaixo da média encontrada para produtos equivalentes."}
            </p>

            <p className="heading mono">ALTERNATIVAS ENCONTRADAS AGORA</p>
            {alternatives.length === 0 && (
              <p className="explain">Não encontramos alternativas comparáveis no momento.</p>
            )}
            {alternatives.map((a, i) => {
              const savings = priceCharged - a.price;
              return (
                <div className="alt-card" key={i}>
                  <div className="alt-top">
                    <p className="name">{a.title}</p>
                    <p className="price">{currency(a.price)}</p>
                  </div>
                  <div className="alt-foot">
                    <span>{a.seller || "Mercado Livre"}</span>
                    <a href={a.permalink} target="_blank" rel="noreferrer">
                      Ver oferta →
                    </a>
                  </div>
                  {savings > 0 && (
                    <p className="savings">economia estimada de {currency(savings)} nesta compra</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
