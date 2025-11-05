import { useState, useEffect, useRef } from "react";
import DocReaderComponent from "./DocReaderComponent";


export default function App() {
  const [modo, setModo] = useState("selfie"); // 'selfie' o 'liveness'
  const capRef = useRef(null);
  const livRef = useRef(null);

  async function ensureDefined(tag) {
    if (customElements.get(tag)) return;
    await customElements.whenDefined(tag);
  }

  useEffect(() => {
    const theme = {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      onboardingScreenStartButtonTitle: '#ffffff',
      onboardingScreenStartButtonBackground: '#7cccc',
      onboardingScreenStartButtonBackgroundHover: '#6a54ee',
      onboardingScreenStartButtonTitleHover: '#ffffff',
      cameraScreenFrontHintLabelBackground: '#111827',
      cameraScreenFrontHintLabelText: '#ffffff',
      cameraScreenStrokeNormal: '#7b61ff',
      cameraScreenSectorActive: '#22c55e',
      cameraScreenSectorTarget: '#93c5fd',
      processingScreenProgress: '#7b61ff',
      retryScreenRetryButtonBackground: '#ef4444',
      retryScreenRetryButtonBackgroundHover: '#dc2626',
      retryScreenRetryButtonTitle: '#ffffff',
      retryScreenRetryButtonTitleHover: '#ffffff',
    };
  
    const cap = capRef.current;
    const liv = livRef.current;
  
    const onCap = (e) => console.log("[face-capture]", e.detail);
    const onLiv = (e) => console.log("[face-liveness]", e.detail);
  
    (async () => {
      if (modo === "selfie" && cap) {
        await ensureDefined("face-capture");     // 👈 evita carrera
        cap.settings = {
          startScreen: true,
          finishScreen: true,
          customization: theme,
        };
        cap.addEventListener("face-capture", onCap);
      }
  
      if (modo === "liveness" && liv) {
        await ensureDefined("face-liveness");    // 👈 evita carrera
        liv.settings = {
          startScreen: true,
          finishScreen: true,
          livenessType: 1,          // pasivo (requiere backend para análisis real)
          timeout: 15000,
          moveCloserTime: 4000,
          holdStillDuration: 4,
          headMovementTimeout: 5000,
          recordingProcess: 2,
          customization: theme,
        };
        liv.addEventListener("face-liveness", onLiv);
      }
    })();
  
    return () => {
      cap?.removeEventListener("face-capture", onCap);
      liv?.removeEventListener("face-liveness", onLiv);
    };
  }, [modo]);
  

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>Regula Face SDK • Demo</h1>

      {/* ✅ Botones que muestran cuál está activo */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={() => setModo("selfie")}
          style={{
            padding: "10px 15px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            backgroundColor: modo === "selfie" ? "#7b61ff" : "#e0e0e0",
            color: modo === "selfie" ? "#fff" : "#000",
            fontWeight: modo === "selfie" ? "bold" : "normal"
          }}
        >
          Selfie (Foto)
        </button>

        <button
          onClick={() => setModo("liveness")}
          style={{
            padding: "10px 15px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            backgroundColor: modo === "liveness" ? "#7b61ff" : "#e0e0e0",
            color: modo === "liveness" ? "#fff" : "#000",
            fontWeight: modo === "liveness" ? "bold" : "normal"
          }}
        >
          Liveness (Vida)
        </button>

        <button
          onClick={() => setModo("document")}
          style={{
            padding: "10px 15px",
            backgroundColor: modo === "document" ? "#7b61ff" : "#ddd",
            color: modo === "document" ? "#fff" : "#000",
            borderRadius: 6,
            border: "none",
            cursor: "pointer"
          }}
        >
          Documento (ID / Pasaporte)
        </button>

        
      </div>

      {/* ✅ Texto para indicar qué proceso vas a realizar */}
      <p style={{ fontSize: "16px", fontWeight: "500", marginBottom: "20px" }}>
        {modo === "selfie"
          ? "📸 Modo Selfie: solo captura de cara."
          : "🧠 Modo Liveness: detecta si la persona está viva (movimiento real)."}
      </p>

      {/* ✅ Mostrar solo uno de los componentes */}
      {modo === "selfie" && (
        <face-capture
          ref={capRef}
          style={{ display: "block", minHeight: 520 }}
        />
      )}

      {modo === "liveness" && (
        <face-liveness
          ref={livRef}
          style={{ display: "block", minHeight: 520 }}
        />
      )}
      {modo === "document" && (
  <div style={{ padding: 20 }}>
    <h2>📄 Captura de documento (próximamente)</h2>
    <p>
      Para activar esta función, necesitamos conectar con <b>Regula Document Reader SDK</b><br/>
      que requiere una <b>licencia válida</b> y un backend.
    </p>
    <p style={{ opacity: 0.5 }}>
      👉 En cuanto tengas la licencia, habilitamos cámara, escaneo de DNI/pasaporte
      y extracción de datos automáticamente.
    </p>
  </div>
)}

    </div>
  );
}
