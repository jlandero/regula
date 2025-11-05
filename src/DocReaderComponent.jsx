// DocReaderComponent.jsx — fijado a WebClient UMD 8.3.537
import { useEffect, useRef, useState } from "react";

const DOC_BACKEND_URL = "http://localhost:4000/api/doc"; // tu backend proxy
const UMD_CDN = "https://cdn.jsdelivr.net/npm/@regulaforensics/document-reader-webclient@8.3.537/dist/webclient.umd.js";

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
  });
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
        // 1) Cargar UMD pinneado a 8.3.537
        await loadScript(UMD_CDN);

        // 2) Localizar el global que expone initialize/startScanner
        // (en 8.3.x suele ser window.DocumentReader o window.RegulaDocumentReader)
        const candidates = [
          window.DocumentReader,
          window.RegulaDocumentReader,
          window.Regula?.DocumentReader,
        ].filter(Boolean);

        let api = null;
        for (const c of candidates) {
          if (!c) continue;
          const init = typeof c.initialize === "function" ? c.initialize : null;
          const start = typeof c.startScanner === "function" ? c.startScanner
                      : typeof c.startScan === "function" ? c.startScan
                      : null;
          if (init && start) {
            api = { initialize: init, startScanner: start };
            break;
          }
        }

        if (!api) {
          throw new Error("No encontré initialize/startScanner en el global del UMD 8.3.537");
        }
        apiRef.current = api;

        // 3) Inicializar apuntando a tu backend proxy (la licencia vive en DocReader API)
        await api.initialize({
          url: DOC_BACKEND_URL,
          // locale: "es" // si tu build lo soporta aquí
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
        scenario: "MrzAndLocate", // o "FullProcess" para lectura completa
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
          Verifica que el backend proxy esté activo en <code>{DOC_BACKEND_URL}</code> y que la <b>Document Reader API</b> tenga licencia válida.
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
