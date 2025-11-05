// App.jsx
import { useState, useEffect, useRef } from "react";
import DocReaderComponent from "./DocReaderComponent";

export default function App() {
  const [modo, setModo] = useState("selfie"); // 'selfie' | 'liveness' | 'document'
  const capRef = useRef(null);
  const livRef = useRef(null);

  async function ensureDefined(tag) {
    if (customElements.get(tag)) return;
    await customElements.whenDefined(tag);
  }

  useEffect(() => {
    const theme = {
      fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      fontSize: "14px",
      onboardingScreenStartButtonTitle: "#ffffff",
      onboardingScreenStartButtonBackground: "#7b61ff",         // <- corregido
      onboardingScreenStartButtonBackgroundHover: "#6a54ee",
      onboardingScreenStartButtonTitleHover: "#ffffff",
      cameraScreenFrontHintLabelBackground: "#111827",
      cameraScreenFrontHintLabelText: "#ffffff",
      cameraScreenStrokeNormal: "#7b61ff",
      cameraScreenSectorActive: "#22c55e",
      cameraScreenSectorTarget: "#93c5fd",
      processingScreenProgress: "#7b61ff",
      retryScreenRetryButtonBackground: "#ef4444",
      retryScreenRetryButtonBackgroundHover: "#dc2626",
      retryScreenRetryButtonTitle: "#ffffff",
      retryScreenRetryButtonTitleHover: "#ffffff",
    };

    const cap = capRef.current;
    const liv = livRef.current;

    const onCap = async (e) => {
      console.log("[face-capture]", e.detail);
      // Si quieres enviar la selfie a tu backend:
      // const dataUrl = e.detail?.data?.response?.image?.dataUrl
      //               || e.detail?.data?.response?.bestFrame?.dataUrl;
      // if (dataUrl) {
      //   await fetch("http://localhost:4000/api/face/detect", {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({ imageBase64: dataUrl }),
      //   });
      // }
    };

    const onLiv = (e) => console.log("[face-liveness]", e.detail);

    (async () => {
      if (modo === "selfie" && cap) {
        await ensureDefined("face-capture");
        cap.settings = {
          startScreen: true,
          finishScreen: true,
          locale: "es",
          customization: theme,
        };
        cap.addEventListener("face-capture", onCap);
      }

      if (modo === "liveness" && liv) {
        await ensureDefined("face-liveness");
        liv.settings = {
          startScreen: true,
          finishScreen: true,
          livenessType: 1, // 0=activo (gestos), 1=pasivo (recomendado con backend)
          locale: "es",
          recordingProcess: 2,
          // Si ya tienes backend proxy para Face, puedes apuntar aquí:
          url: "http://localhost:4000/api/face/liveness",
          // headers: { Authorization: "Bearer <token>" },
          timeout: 15000,
          moveCloserTime: 4000,
          holdStillDuration: 4,
          headMovementTimeout: 5000,
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
    <div style={{ maxWidth: 720, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>Regula • Demo</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          onClick={() => setModo("selfie")}
          style={{
            padding: "10px 15px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            backgroundColor: modo === "selfie" ? "#7b61ff" : "#e0e0e0",
            color: modo === "selfie" ? "#fff" : "#000",
            fontWeight: modo === "selfie" ? "bold" : "normal",
          }}
        >
          Selfie (Foto)
        </button>

        <button
          onClick={() => setModo("liveness")}
          style={{
            padding: "10px 15px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            backgroundColor: modo === "liveness" ? "#7b61ff" : "#e0e0e0",
            color: modo === "liveness" ? "#fff" : "#000",
            fontWeight: modo === "liveness" ? "bold" : "normal",
          }}
        >
          Liveness (Vida)
        </button>

        <button
          onClick={() => setModo("document")}
          style={{
            padding: "10px 15px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            backgroundColor: modo === "document" ? "#7b61ff" : "#e0e0e0",
            color: modo === "document" ? "#fff" : "#000",
            fontWeight: modo === "document" ? "bold" : "normal",
          }}
        >
          Documento (ID / Pasaporte)
        </button>
      </div>

      {/* Descripción */}
      <p style={{ fontSize: 16, fontWeight: 500, marginBottom: 20 }}>
        {modo === "selfie"
          ? "📸 Modo Selfie: captura de rostro; tú decides si enviar la imagen a tu backend."
          : modo === "liveness"
          ? "🧠 Modo Liveness: usa pasivo (o activo) y puede apuntar a tu Face API."
          : "📄 Documento: escaneo real via WebClient contra tu Document Reader API (por backend proxy)."}
      </p>

      {/* Render según modo */}
      {modo === "selfie" && (
        <face-capture ref={capRef} style={{ display: "block", minHeight: 520 }} />
      )}

      {modo === "liveness" && (
        <face-liveness ref={livRef} style={{ display: "block", minHeight: 520 }} />
      )}

      {modo === "document" && <DocReaderComponent />}
    </div>
  );
}
