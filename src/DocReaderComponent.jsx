import { useEffect, useRef, useState } from "react";

const DOC_BACKEND_URL = "http://localhost:4000/api/doc"; // tu backend proxy

export default function DocReaderComponent() {
  const apiRef = useRef({ initialize: null, startScanner: null });
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // Carga dinámica para evitar problemas de SSR/bundling
        const mod = await import("@regulaforensics/document-reader-webclient");

        // Compatibilidad: nombrados o default
        const initialize =
          mod?.initialize || mod?.default?.initialize || null;
        const startScanner =
          mod?.startScanner || mod?.default?.startScanner || null;

        if (!initialize || !startScanner) {
          console.error("WebClient module shape:", mod);
          throw new Error(
            "El WebClient no expone initialize/startScanner (ver consola)."
          );
        }

        apiRef.current = { initialize, startScanner };

        // Inicializa apuntando a TU backend proxy (la licencia vive en el DocReader API)
        await initialize({
          url: DOC_BACKEND_URL,
          // locale: "es", // si tu versión lo admite aquí
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

      const { startScanner } = apiRef.current;
      const resp = await startScanner({
        scenario: "MrzAndLocate", // o "FullProcess", "Mrz", "Barcode", etc.
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
          Verifica que el backend proxy esté activo en{" "}
          <code>{DOC_BACKEND_URL}</code> y que la <b>Document Reader API</b>{" "}
          tenga licencia válida.
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
