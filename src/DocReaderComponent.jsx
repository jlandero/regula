import { useEffect, useRef, useState } from "react";

const DOC_BACKEND_URL = "http://localhost:4000/api/doc"; // tu backend proxy

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const exists = document.querySelector(`script[src="${src}"]`);
    if (exists) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
  });
}

async function resolveWebClient() {
  // 1) Main entry
  try {
    const mod = await import("@regulaforensics/document-reader-webclient");
    const api = pickAPI(mod);
    if (api) return api;
    console.warn("[DocReader] main entry no expone initialize/startScanner. Keys:", Object.keys(mod || {}));
  } catch (e) {
    console.warn("[DocReader] fallo import main:", e?.message || e);
  }

  // 2) Dist path
  try {
    const mod = await import("@regulaforensics/document-reader-webclient/dist/webclient.js");
    const api = pickAPI(mod);
    if (api) return api;
    console.warn("[DocReader] dist/webclient.js sin initialize/startScanner. Keys:", Object.keys(mod || {}));
  } catch (e) {
    console.warn("[DocReader] fallo import dist/webclient.js:", e?.message || e);
  }

  // 3) CDN global
  try {
    const CDN = "https://cdn.jsdelivr.net/npm/@regulaforensics/document-reader-webclient/dist/webclient.js";
    await loadScript(CDN);
    // posibles nombres globales
    const candidates = [
      window.DocumentReader,
      window.RegulaDocumentReader,
      window.Regula?.DocumentReader,
    ].filter(Boolean);

    for (const cand of candidates) {
      const api = pickAPI(cand);
      if (api) return api;
    }
    console.warn("[DocReader] global no encontrado; window keys:", Object.keys(window));
  } catch (e) {
    console.warn("[DocReader] fallo carga CDN:", e?.message || e);
  }

  throw new Error("No encontré la API del WebClient (initialize/startScanner). Revisa la versión instalada.");
}

// Detecta distintas formas de export
function pickAPI(mod) {
  if (!mod) return null;
  // export nombrado
  if (typeof mod.initialize === "function" && typeof mod.startScanner === "function") {
    return { initialize: mod.initialize, startScanner: mod.startScanner };
  }
  // default con métodos
  if (mod.default && typeof mod.default.initialize === "function" && typeof mod.default.startScanner === "function") {
    return { initialize: mod.default.initialize, startScanner: mod.default.startScanner };
  }
  // objeto con otro nombre común
  if (mod.DocumentReader && typeof mod.DocumentReader.initialize === "function" && typeof mod.DocumentReader.startScanner === "function") {
    return { initialize: mod.DocumentReader.initialize, startScanner: mod.DocumentReader.startScanner };
  }
  return null;
}

export default function DocReaderComponent() {
  const apiRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const api = await resolveWebClient();
        apiRef.current = api;

        // Inicializa apuntando a TU backend proxy (la licencia vive en el DocReader API)
        await api.initialize({
          url: DOC_BACKEND_URL,
          // locale: "es",  // si tu versión lo soporta aquí
        });

        setReady(true);
      } catch (e) {
        console.error("DocReader init error:", e);
        setError(String(e?.message || e));
      }
    })();
  }, []);

  const start = async () => {
    try {
      setRunning(true);
      setResult(null);
      setError("");

      const resp = await apiRef.current.startScanner({
        scenario: "MrzAndLocate", // "FullProcess" si quieres lectura completa
      });

      console.log("DocReader response:", resp);
      setResult(resp);
    } catch (e) {
      console.error("DocReader scan error:", e);
      setError(String(e?.message || e));
    } finally {
      setRunning(false);
    }
  };

  if (error) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Documento de identidad</h2>
        <p style={{ color: "#b00" }}>Error: {error}</p>
        <p style={{ opacity: 0.7 }}>
          Revisa que el backend proxy esté activo en <code>{DOC_BACKEND_URL}</code> y que tu <b>Document Reader API</b> tenga licencia válida.
        </p>
      </div>
    );
  }

  if (!ready) return <p style={{ padding: 16 }}>Cargando Document Reader…</p>;

  return (
    <div style={{ padding: 16 }}>
      <h2>Documento de identidad</h2>
      <button
        onClick={start}
        disabled={running}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: "none",
          background: running ? "#9aa0a6" : "#7b61ff",
          color: "#fff",
          cursor: running ? "not-allowed" : "pointer",
        }}
      >
        {running ? "Escaneando…" : "Escanear documento"}
      </button>

      {result && (
        <>
          <p style={{ marginTop: 12 }}>Resultado (JSON):</p>
          <pre
            style={{
              marginTop: 8,
              background: "#111",
              color: "#0f0",
              padding: 12,
              borderRadius: 8,
              maxHeight: 360,
              overflow: "auto",
            }}
          >
{JSON.stringify(result, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
