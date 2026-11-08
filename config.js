// Configuración opcional. Si dejas SYNC_URL vacío, la app trabaja 100 % en el teléfono.
// Si pones la URL de tu servidor, cada guardado se envía como copia de seguridad (PUT)
// y, sin conexión, se encola en IndexedDB y se reenvía solo al volver la red.
window.APP_CONFIG = {
  SYNC_URL: "",        // ej: "https://tu-servidor.com/api/taskion/state"
  SYNC_METHOD: "PUT",
  SYNC_HEADERS: {}     // ej: { "Authorization": "Bearer TU_TOKEN" }
};
