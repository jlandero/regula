import { useEffect, useRef, useState } from "react";

// ⚠️ Pega aquí tu licencia DEV en Base64.
// Si la dejas vacía, el SDK no va a inicializar la cámara.
const LICENSE_BASE64 = ""; // <-- pega tu licencia aquí

const DOC_CDN = "https://unpkg.com/@regulaforensics/vp-frontend-document-components@latest/dist/main.iife.js";

async function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = (e) => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
  });
}

export default function DocReaderComponent() {
  const ref = useRef(null);
  const [step, setStep] = useState("boot"); // boot | defined | initialized | ready | error
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        // 1) Cargar bundle
        await loadScript(DOC_CDN);

        // 2) Verificar APIs globales del bundle
        const { defineComponents, DocumentReaderService } = window;
        if (!defineComponents || !DocumentReaderService) {
          throw new Error("El bundle no expuso defineComponents / DocumentReaderService.");
        }

        // 3) Definir custom elements
        await defineComponents();
        setStep("defined");

        // 4) Inicializar service con licencia
        const svc = new DocumentReaderService();
        if (!LICENSE_BASE64) {
          // Sin licencia: no se podrá abrir la cámara (te mostramos aviso)
          setStep("initialized"); // marcamos como siguiente paso para mostrar el componente con aviso
        } else {
          await svc.initialize({ license: LICENSE_BASE64 });
          setStep("initialized");
        }
        // Guardar referencia global por si quieres usarla luego
        window.RegulaDocumentSDK = svc;

        // 5) Esperar a que el custom element exista
        await customElements.whenDefined("document-reader");

        // 6) Configurar el componente
        const el = ref.current;
        if (!el) throw new Error("No se encontró el <document-reader> en el DOM.");

        el.settings = {
          startScreen: true,
          finishScreen: false,
          // Cuando conectes backend: escenario recomendado, p.e.:
          // scenario: "MrzAndLocate",
        };

        setStep("ready");
      } catch (err) {
        console.error("[DocReader boot error]", err);
        setError(String(err?.message || err));
        setStep("error");
      }
    })();
  }, []);

  if (step === "boot") return <p>Cargando módulo de documento…</p>;
  if (step === "defined" && !LICENSE_BASE64)
    return (
      <>
        <p style={{ color: "#b25" }}>
          Falta licencia DEV para inicializar el lector.
          Pega tu <code>LICENSE_BASE64</code> en <code>DocReaderComponent.jsx</code>.
        </p>
        <document-reader ref={ref} style={{ display:"block", width:"100%", minHeight:420, border:"1px solid #ccc" }} />
      </>
    );
  if (step === "initialized" && !LICENSE_BASE64)
    return (
      <>
        <p style={{ color: "#b25" }}>
          Sin licencia, el componente no abrirá la cámara.
          Agrega la licencia y recarga.
        </p>
        <document-reader ref={ref} style={{ display:"block", width:"100%", minHeight:420, border:"1px solid #ccc" }} />
      </>
    );
  if (step === "error") return <p style={{ color: "#b00" }}>Error: {error}</p>;

  return (
    <document-reader
      ref={ref}
      style={{ display:"block", width:"100%", minHeight:420, border:"1px solid #ccc", borderRadius:8 }}
    />
  );
}
