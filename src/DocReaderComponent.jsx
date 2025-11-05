import { useEffect, useRef, useState } from "react";

const DOC_BACKEND_URL = "http://localhost:4000/api/doc"; // tu backend proxy

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

// Busca recursivamente funciones con esos nombres dentro de un objeto (por si cambian de nivel)
function deepFindAPIMethods(obj) {
  const seen = new Set();
  function walk(o, path = []) {
    if (!o || typeof o !== "object" || seen.has(o)) return null;
    seen.add(o);
    const hasInit = typeof o.initialize === "function";
    const hasStart = typeof o.startScanner === "function" || typeof o.startScan === "function";
    if (hasInit && hasStart) {
      return {
        initialize: o.initialize,
        startScanner: o.startScanner || o.startScan, // soporta ambos nombres
        sourcePath: path.join(".") || "(root)",
      };
    }
    for (const k of Object.keys(o)) {
      const sub = o[k];
      const found = walk(sub, path.concat(k));
      if (found) return found;
    }
    return null;
  }
  return walk(obj);
}

async function resolveWebClient() {
  // 1) Paquete principal (ESM)
  try {
    const mod = await import("@regulaforensics/document-reader-webclient");
    console.log("[DocReader] ESM main keys:", Object.keys(mod || {}));
    // Intenta: named, default, o en objetos anidados
    const candidates = [
      { label: "named root", obj: mod },
      { label: "default", obj: mod?.default },
    ];
    for (const c of candidates) {
      const api = deepFindAPIMethods(c.obj);
      if (api) {
        console.log("[DocReader] API encontrada en", c.label, "→", api.sourcePath);
        return { initialize: api.initialize, startScanner: api.startScanner };
      }
    }
  } catch (e) {
    console.warn("[DocReader] fallo import ESM main:", e?.message || e);
  }

  // 2) Ruta alternativa del paquete
  try {
    const mod = await import("@regulaforensics/document-reader-webclient/dist/webclient.js");
    console.log("[DocReader] ESM dist keys:", Object.keys(mod || {}));
    const candidates = [
      { label: "dist root", obj: mod },
      { label: "dist default", obj: mod?.default },
    ];
    for (const c of candidates) {
      const api = deepFindAPIMethods(c.obj);
      if (api) {
        console.log("[DocReader] API encontrada en", c.label, "→", api.sourcePath);
        return { initialize: api.initialize, startScanner: api.startScanner };
      }
    }
  } catch (e) {
    console.warn("[DocReader] fallo import dist/webclient.js:", e?.message || e);
  }

  // 3) UMD por CDN (global)
  try {
    const CDN = "https://cdn.jsdelivr.net/npm/@regulaforensics/document-reader-webclient/dist/webclient.umd.js";
    await loadScript(CDN);
    const globals = [
      { label: "window.DocumentReader", obj: window.DocumentReader },
      { label: "window.RegulaDocumentReader", obj: window.RegulaDocumentReader },
      { label: "window.Regula?.DocumentReader", obj: window.Regula?.DocumentReader },
    ];
    for (const g of globals) {
      if (!g.obj) continue;
      const api = deepFindAPIMethods(g.obj);
      if (api) {
        console.log("[DocReader] API encontrada en global", g.label, "→", api.sourcePath);
        return { initialize: api.initialize, startScanner: api.startScanner };
      }
    }
  } catch (e) {
    console.warn("[DocReader] fallo carga UMD:", e?.message || e);
  }

  throw new Error(
    "No encontré initialize/startScanner en el WebClient (ESM/UMD). " +
    "Revisa la versión instalada o usa la UMD del CDN."
  );
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

        // Inicializa apuntando a TU backend proxy (la licencia vive en DocReader API)
        await api.initialize({
          url: DOC_BACKEND_URL,
          // locale: "es", // si tu versión lo soporta aquí
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
          Verifica que el backend proxy esté activo en <code>{DOC_BACKEND_URL}</code> y que la{" "}
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
