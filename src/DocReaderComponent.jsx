// DocReaderComponent.jsx — carga local del webclient y detecta API
import { useEffect, useRef, useState } from "react";

const DOC_BACKEND_URL = "http://localhost:4000/api/doc"; // tu backend proxy
const LOCAL_WEBCLIENT = "/vendor/regula/webclient.js";   // servido por Vite desde public/

// Busca recursivamente un objeto que tenga init+start (nombres posibles)
function deepFindAPI(root) {
  const seen = new Set();
  const initNames  = ["initialize", "init", "setup", "create"];
  const startNames = ["startScanner", "startScan", "start", "scan", "run"];

  function walk(obj) {
    if (!obj || typeof obj !== "object" || seen.has(obj)) return null;
    seen.add(obj);

    const init = initNames.map(n => (typeof obj[n] === "function" ? obj[n] : null)).find(Boolean);
    const start = startNames.map(n => (typeof obj[n] === "function" ? obj[n] : null)).find(Boolean);
    if (init && start) return { initialize: init.bind(obj), startScanner: start.bind(obj) };

    for (const k of Object.keys(obj)) {
      const found = walk(obj[k]);
      if (found) return found;
    }
    return null;
  }
  return walk(root);
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
        // 1) Import dinámico del archivo local (evita exports problemáticos y CDNs)
        const mod = await import(LOCAL_WEBCLIENT /* @vite-ignore */);

        // 2) Detectar API en el módulo (raíz / default / anidados)
        const candidates = [mod, mod?.default].filter(Boolean);
        let api = null;

        for (const c of candidates) {
          if (typeof c?.initialize === "function" && typeof c?.startScanner === "function") {
            api = { initialize: c.initialize, startScanner: c.startScanner };
            break;
          }
        }
        if (!api) {
          for (const c of candidates) {
            const found = deepFindAPI(c);
            if (found) { api = found; break; }
          }
        }
        if (!api) {
          console.log("[DocReader] keys mod:", Object.keys(mod || {}));
          console.log("[DocReader] keys default:", mod?.default && Object.keys(mod.default));
          throw new Error("No encontré initialize/startScanner en el webclient local.");
        }

        apiRef.current = api;

        // 3) Inicializar contra TU backend (la licencia vive en el DocReader API)
        await api.initialize({
          url: DOC_BACKEND_URL,
          // locale: "es", // si tu build lo soporta
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
        scenario: "MrzAndLocate", // o "FullProcess" si quieres lectura completa
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
          Verifica que el backend proxy esté activo en <code>{DOC_BACKEND_URL}</code> y que tu{" "}
          <b>Document Reader API</b> tenga licencia válida.
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
