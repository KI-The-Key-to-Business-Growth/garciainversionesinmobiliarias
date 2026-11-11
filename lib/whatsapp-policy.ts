// Política del registro de clics de WhatsApp.
//
// true  (vigente): el clic SOLO se registra en Supabase si el visitante dio consentimiento (analítica o
//        publicidad). La atribución de campaña respeta las reglas de consentimiento existentes
//        (identificadores de clic y cookies de Meta solo con publicidad). Sin consentimiento el
//        mensaje igual sale con el activo y la referencia, pero NO se guarda nada.
// false (alternativa, requiere aprobación jurídica): registro operativo mínimo (referencia, activo,
//        página) también sin consentimiento, siempre sin atribución de campaña.
//
// Cambiarlo es una decisión legal y de negocio: no cambiar sin aprobación expresa.
export const WHATSAPP_CLICK_REQUIRES_CONSENT = true;

// true (vigente): la atribución PUBLICITARIA del clic (UTM, campaña, conjunto, anuncio, ubicación,
//        identificadores de clic, cookies de Meta, toques de atribución, sesión) se guarda SOLO con
//        consentimiento de publicidad. Con consentimiento solo de analítica se guarda el registro
//        básico (referencia, activo, página y estado de consentimiento), sin campaña.
// false: se aplican las reglas generales de atribución (analítica permite UTM e IDs de campaña).
export const WHATSAPP_ATTRIBUTION_REQUIRES_MARKETING_CONSENT = true;
