// Activo que la persona está mirando (ficha de propiedad, desarrollo u oportunidad). Lo fija
// `PropertyViewTracker` al montarse y lo lee el rastreo de WhatsApp para armar el mensaje preparado.
// No es un dato personal y no depende del consentimiento: solo describe la página.

export type WhatsAppAssetContext = {
  // Clave estable por activo dentro de la sesión (una referencia de WhatsApp por clave).
  key: string;
  // Nombre visible para el texto del mensaje.
  label?: string;
  propertyId?: number;
};

let current: WhatsAppAssetContext | null = null;

export function setWhatsAppAssetContext(context: WhatsAppAssetContext): void {
  current = context;
}

// Solo limpia si el contexto vigente es el mismo: al navegar entre fichas el nuevo ya pudo fijarse.
export function clearWhatsAppAssetContext(context: WhatsAppAssetContext): void {
  if (current === context) current = null;
}

export function getWhatsAppAssetContext(): WhatsAppAssetContext | null {
  return current;
}

export function _resetWhatsAppAssetContext(): void {
  current = null;
}
