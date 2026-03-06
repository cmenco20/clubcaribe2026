/* ══════════════════════════════════════════════════
   CLUB CARIBE — Configuración de URLs Power Automate
   
   ⚠️  ESTE ARCHIVO NO SE SUBE A GITHUB
   ⚠️  Agregar "config.js" al archivo .gitignore
   
   Instrucciones:
   1. Abre cada flujo en Power Automate
   2. Clic en trigger HTTP → "..." → "Regenerar clave"
   3. Copia la nueva URL y pégala aquí
   4. Guarda este archivo en la misma carpeta del proyecto
   5. NUNCA subas este archivo a GitHub
══════════════════════════════════════════════════ */

// Flujo 1: Registro y actualización de inscripciones
const POWER_AUTOMATE_URL = "https://defaultb468904add5149289435b961241d32.77.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/af0ee7edcc7042f5881d4e0b8e376e4c/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=rmE7DqkZkiYNmdvaP2xKdZFnkhjjp2GH2rsXpK8q8lc";

// Flujo 2: Listar todos los registros (admin + código consecutivo)
const POWER_AUTOMATE_LISTAR_URL = "https://defaultb468904add5149289435b961241d32.77.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/b2e8b902c13247c189ba5ca06229c726/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=ofcWfmPhhwalhBntZJxojji4jF6KeUoqddIdtqS7168";
