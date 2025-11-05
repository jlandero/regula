// DocReaderComponent.jsx (sin exponer licencia en el front)
import { useEffect, useState } from "react";
import * as DocReader from "@regulaforensics/document-reader-webclient";

const DOC_BACKEND_URL = "http://localhost:4000/api/doc"; // 👈 tu backend proxy

export default function DocReaderComponent() {
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // ✅ Inicializa apuntando a TU backend (que a su vez tiene la licencia en el servicio DocReader)
        await DocReader.initialize({
          url: DOC_BACKEND_URL, // No pasamos license aquí
          // Puedes setear idioma/UI por acá si tu versión lo soporta:
          // locale: "es",
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

      // Escenario típico; ajusta según lo que quieras probar:
      const resp = await DocReader.startScanner({
        scenario: "MrzAndLocate",  // Alternativas: "FullProcess", "Mrz", "Barcode", etc.
        // Puedes agregar más params si los necesitas (quality, timeouts, etc.)
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
          Revisa que tu backend proxy esté activo en <code>{DOC_BACKEND_URL}</code> y que la
          <b> Document Reader API</b> tenga licencia válida.
        </p>
      </div>
    );
  }

  if (!ready) {
    return <p style={{ padding: 16 }}>Cargando Document Reader…</p>;
  }

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
          cursor: running ? "not-allowed" : "pointer"
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
              overflow: "auto"
            }}
          >
{JSON.stringify(result, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
