"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const mongoose_1 = __importDefault(require("mongoose"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const mongodb_1 = require("./utils/mongodb");
const usuario_routes_1 = __importDefault(require("./routes/usuario.routes"));
const publicaciones_routes_1 = __importDefault(require("./routes/publicaciones.routes"));
const biblioteca_routes_1 = __importDefault(require("./routes/biblioteca.routes"));
const element_routes_1 = __importDefault(require("./routes/element.routes"));
const categoriaPreferencia_routes_1 = __importDefault(require("./routes/categoriaPreferencia.routes"));
const configuracion_routes_1 = __importDefault(require("./routes/configuracion.routes"));
const files_routes_1 = __importDefault(require("./routes/files.routes"));
const seccionAcerca_routes_1 = __importDefault(require("./routes/seccionAcerca.routes"));
const perfil_routes_1 = __importDefault(require("./routes/perfil.routes"));
const publicacionExpiration_service_1 = require("./services/publicacionExpiration.service");
const tutorial_routes_1 = __importDefault(require("./routes/tutorial.routes"));
const notificaciones_routes_1 = __importDefault(require("./routes/notificaciones.routes"));
const paqueteSuscripcion_routes_1 = __importDefault(require("./routes/paqueteSuscripcion.routes"));
const publicidad_routes_1 = __importDefault(require("./routes/publicidad.routes"));
const proyectosDestacados_routes_1 = __importDefault(require("./routes/proyectosDestacados.routes"));
// Rutas de PayPal
const paypal_routes_1 = __importDefault(require("./routes/paypal.routes"));
const bancoProfesionales_routes_1 = __importDefault(require("./routes/bancoProfesionales.routes"));
// Rutas de Boletines
const boletin_routes_1 = __importDefault(require("./routes/boletin.routes"));
const app = (0, express_1.default)();
dotenv_1.default.config();
app.disable("x-powered-by");
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "25mb" }));
/** CORS: lista fija + extra por variable (para Railway Frontend luego) */
const defaultCorsOrigins = [
    "http://localhost:3001",
    "http://localhost:3000",
    "https://proyecto-komuness-front.vercel.app",
    "https://komuness-project.netlify.app",
    "http://64.23.137.192",
    "http://159.54.148.238",
    "https://komuness.duckdns.org",
    "https://proyecto-komuness-production.up.railway.app",
    "https://frontend-production-0b7e.up.railway.app/",
];
const extraCorsOrigins = (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const allowedOrigins = Array.from(new Set([...defaultCorsOrigins, ...extraCorsOrigins]));
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
}));
/** ====== ESTÁTICOS (reemplazo directo de Nginx alias) ====== */
const UPLOADS_ROOT = process.env.UPLOAD_DIR || "/srv/uploads";
const LIBRARY_DIR = process.env.LIBRARY_DIR || path_1.default.join(UPLOADS_ROOT, "biblioteca");
const ACERCADE_DIR = process.env.ACERCADE_LIB || path_1.default.join(UPLOADS_ROOT, "acercade");
const PROFILE_DIR = process.env.PROFILE_LIB || path_1.default.join(UPLOADS_ROOT, "perfil");
const CSV_DIR = process.env.CSV_LIB || path_1.default.join(UPLOADS_ROOT, "csv");
app.use("/uploads", express_1.default.static(UPLOADS_ROOT));
app.use("/biblioteca", express_1.default.static(process.env.LIBRARY_DIR || UPLOADS_ROOT + "/biblioteca"));
app.use("/acercade", express_1.default.static(process.env.ACERCADE_LIB || UPLOADS_ROOT + "/acercade"));
app.use("/perfil", express_1.default.static(process.env.PROFILE_LIB || UPLOADS_ROOT + "/perfil"));
app.use("/csv", express_1.default.static(process.env.CSV_LIB || UPLOADS_ROOT + "/csv"));
/** ====== Rutas API ====== */
app.use("/api/configuracion", configuracion_routes_1.default);
app.use("/api/usuario", usuario_routes_1.default);
app.use("/api/publicaciones", publicaciones_routes_1.default);
app.use("/api/biblioteca", biblioteca_routes_1.default);
app.use("/api/elements", element_routes_1.default);
app.use('/api/categoria-preferencias', categoriaPreferencia_routes_1.default);
app.use("/api", files_routes_1.default);
app.use("/api/acerca-de", seccionAcerca_routes_1.default);
app.use("/api/perfil", perfil_routes_1.default);
app.use("/api/banco-profesionales", bancoProfesionales_routes_1.default);
app.use("/api/paypal", paypal_routes_1.default);
app.use("/api/tutoriales", tutorial_routes_1.default);
app.use("/api/proyectos-destacados", proyectosDestacados_routes_1.default);
app.use("/api/notificaciones", notificaciones_routes_1.default);
app.use("/api/paquetes-suscripcion", paqueteSuscripcion_routes_1.default);
app.use("/api/publicidad", publicidad_routes_1.default);
app.use("/api/boletines", boletin_routes_1.default);
/** Smoke test mínimo */
app.get("/api/", (_req, res) => {
    res.send("Hello World");
});
/** Healthcheck mínimo para Railway (útil para ver si conectó a Mongo) */
app.get(["/health", "/api/health"], (_req, res) => {
    res.json({
        ok: true,
        uptimeSeconds: Math.round(process.uptime()),
        mongoReadyState: mongoose_1.default.connection.readyState, // 1 = connected
    });
});
// Middleware global de errores
const globalErrorHandler = (err, _req, res, _next) => {
    if (err &&
        (err.code === "LIMIT_FILE_SIZE" ||
            err.code === "LIMIT_PART_COUNT" ||
            err.code === "LIMIT_FILE_COUNT")) {
        res.status(413).json({
            success: false,
            message: `El archivo excede el límite permitido de ${process.env.LIBRARY_MAX_FILE_SIZE_MB || "200"} MB.`,
            errorCode: err.code || "LIMIT_EXCEEDED",
        });
        return;
    }
    if (err && err.status === 413) {
        res.status(413).json({
            success: false,
            message: `Payload demasiado grande. Asegúrate que los archivos no superen ${process.env.LIBRARY_MAX_FILE_SIZE_MB || "200"} MB.`,
        });
        return;
    }
    if (err && (err.code === "ECONNRESET" || err.code === "ETIMEDOUT")) {
        res.status(502).json({
            success: false,
            message: "Hubo un problema de conexión durante la carga. Intenta nuevamente.",
            errorCode: err.code,
        });
        return;
    }
    if (err &&
        typeof err.message === "string" &&
        err.message.includes("Tipo de archivo no permitido")) {
        res.status(400).json({
            success: false,
            message: err.message,
            errorCode: "INVALID_FILE_TYPE",
        });
        return;
    }
    if (err) {
        console.error("Unhandled error middleware:", err);
        res
            .status(500)
            .json({ success: false, message: "Error interno del servidor" });
        return;
    }
};
app.use(globalErrorHandler);
const port = process.env.PORT || 5000;
// Conexión a MongoDB
(() => __awaiter(void 0, void 0, void 0, function* () {
    yield (0, mongodb_1.connectBD)(process.env.BD_URL);
    (0, publicacionExpiration_service_1.startPublicationExpirationJob)();
    console.log("✅ MongoDB conectado");
}))();
exports.default = app;
if (require.main === module) {
    (0, mongodb_1.connectBD)(process.env.BD_URL || "").then(() => {
        (0, publicacionExpiration_service_1.startPublicationExpirationJob)();
        console.log("Connected to MongoDB");
        app.listen(port, () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
    });
}
