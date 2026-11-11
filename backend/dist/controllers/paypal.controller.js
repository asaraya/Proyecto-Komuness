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
exports.webhook = exports.captureAndUpgrade = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const paypal_1 = require("../utils/paypal");
const paymentRetry_1 = require("../utils/paymentRetry");
const paymentErrorHandler_1 = require("../utils/paymentErrorHandler");
const configuracion_model_1 = require("../models/configuracion.model");
const USERS_COL = "usuarios"; // cambia si tu colección de usuarios tiene otro nombre
const PAY_COL = "payments"; // colección de auditoría/idempotencia
// AGREGADO PARA EL VENCIMIENTO
const PLAN_DAYS = {
    mensual: 30,
    anual: 365,
};
// AGREGADO PARA EL VENCIMIENTO
function setUserRolePremium(args) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id, email, plan } = args;
        const users = mongoose_1.default.connection.collection(USERS_COL);
        const filter = {};
        if (id) {
            filter._id = new mongoose_1.default.Types.ObjectId(id);
        }
        else if (email) {
            filter.email = email;
        }
        else {
            console.warn("[PayPal] setUserRolePremium llamado sin id ni email. No se actualizó ningún usuario.");
            return;
        }
        const userDoc = yield users.findOne(filter);
        if (!userDoc) {
            console.warn("[PayPal] Usuario no encontrado para setUserRolePremium:", filter);
            return;
        }
        const now = new Date();
        const daysToAdd = plan && PLAN_DAYS[plan] ? PLAN_DAYS[plan] : PLAN_DAYS.mensual;
        let baseDate = now;
        const existing = userDoc.fechaVencimientoPremium;
        if (existing instanceof Date && existing > now) {
            baseDate = existing;
        }
        const nuevaFecha = new Date(baseDate.getTime());
        nuevaFecha.setDate(nuevaFecha.getDate() + daysToAdd);
        const update = {
            $set: {
                tipoUsuario: 3,
                fechaVencimientoPremium: nuevaFecha,
            },
        };
        const result = yield users.updateOne(filter, update);
    });
}
function savePayment(doc) {
    return __awaiter(this, void 0, void 0, function* () {
        const col = mongoose_1.default.connection.collection(PAY_COL);
        // índices para idempotencia (si ya existen, ignora el error)
        try {
            yield col.createIndex({ captureId: 1 }, { unique: true, sparse: true });
        }
        catch (_a) { }
        try {
            yield col.createIndex({ eventId: 1 }, { unique: true, sparse: true });
        }
        catch (_b) { }
        try {
            yield col.insertOne(doc);
            return { idempotent: false };
        }
        catch (e) {
            if ((e === null || e === void 0 ? void 0 : e.code) === 11000)
                return { idempotent: true }; // duplicado
            throw e;
        }
    });
}
// Función para obtener montos de configuración
function getMontosConfigurados() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const configs = yield configuracion_model_1.modelConfiguracion.find({
                clave: { $in: ['plan_mensual_monto', 'plan_anual_monto'] }
            }).lean();
            const montos = {
                mensual: 4.0,
                anual: 8.0
            };
            configs.forEach(config => {
                if (config.clave === 'plan_mensual_monto') {
                    montos.mensual = Number(config.valor) || 4.0;
                }
                else if (config.clave === 'plan_anual_monto') {
                    montos.anual = Number(config.valor) || 8.0;
                }
            });
            return montos;
        }
        catch (error) {
            console.error('[PayPal] Error al obtener montos configurados:', error);
            return { mensual: 4.0, anual: 8.0 };
        }
    });
}
/** POST /api/paypal/capture  body: { orderId, plan? }  */
const captureAndUpgrade = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    const retryHistory = [];
    try {
        // AGREGADO PARA EL VENCIMIENTO
        const { orderId, plan: bodyPlan } = req.body;
        if (!orderId) {
            res.status(400).json({ error: "orderId requerido" });
            return;
        }
        // 🔐 Usuario autenticado en tu sistema (NO el de PayPal)
        const authReq = req;
        const loggedUserId = ((_c = (_b = (_a = authReq.user) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString) === null || _c === void 0 ? void 0 : _c.call(_b)) ||
            ((_d = authReq.user) === null || _d === void 0 ? void 0 : _d._id) ||
            authReq.userId ||
            ((_e = authReq.user) === null || _e === void 0 ? void 0 : _e.id);
        // Obtener montos configurados
        const montosConfigurados = yield getMontosConfigurados();
        // Ejecutar captureOrder con sistema de reintentos
        const result = yield (0, paymentRetry_1.retryWithExponentialBackoff)(() => (0, paypal_1.captureOrder)(orderId), {
            maxRetries: 3,
            baseDelay: 1000, // 1 segundo
            timeout: 30000, // 30 segundos
            onRetry: (error, attemptNumber) => {
                // Agregar entrada al historial de reintentos
                retryHistory.push({
                    timestamp: new Date(),
                    attemptNumber,
                    errorCode: error.code,
                    errorMessage: error.message,
                    statusCode: error.statusCode,
                });
            },
        });
        // Si la operación falló después de todos los reintentos
        if (!result.success) {
            const error = result.error;
            const userMessage = paymentErrorHandler_1.PaymentErrorHandler.getUserMessage(error);
            const httpStatus = paymentErrorHandler_1.PaymentErrorHandler.getHttpStatusCode(error);
            console.error(`[PayPal] Captura fallida después de ${result.attempts} intentos:`, error.code);
            // Guardar intento fallido en la base de datos para auditoría
            try {
                yield savePayment({
                    orderId,
                    status: "FAILED",
                    raw: { error: error.message, code: error.code },
                    source: "capture",
                    attemptNumber: result.attempts,
                    lastError: error.message,
                    retryHistory,
                    userId: loggedUserId
                        ? new mongoose_1.default.Types.ObjectId(loggedUserId)
                        : undefined,
                });
            }
            catch (saveError) {
                console.error("[PayPal] Error al guardar intento fallido:", saveError);
            }
            // Responder al cliente con información estructurada
            res.status(httpStatus).json({
                error: error.code,
                message: userMessage,
                canRetry: error.isRetryable,
                attempts: result.attempts,
            });
            return;
        }
        const data = result.data;
        const resource = data;
        const info = (0, paypal_1.extractPaymentInfo)(resource);
        // AGREGADO PARA EL VENCIMIENTO
        // Determinar plan (mensual/anual) a partir del body o del monto
        let effectivePlan = "mensual";
        if (bodyPlan === "mensual" || bodyPlan === "anual") {
            effectivePlan = bodyPlan;
        }
        else {
            const rawValue = info.value;
            const amount = typeof rawValue === "string"
                ? parseFloat(rawValue)
                : typeof rawValue === "number"
                    ? rawValue
                    : Number(rawValue);
            // Usar montos configurados para determinar el plan
            if (!Number.isNaN(amount) && amount >= montosConfigurados.anual) {
                effectivePlan = "anual";
            }
            else if (amount >= montosConfigurados.mensual) {
                effectivePlan = "mensual";
            }
        }
        const paypalUserId = (_f = (0, paypal_1.extractUserId)(resource)) !== null && _f !== void 0 ? _f : undefined;
        const saved = yield savePayment({
            orderId,
            captureId: info.captureId,
            status: info.status,
            value: info.value,
            currency: info.currency,
            payerId: info.payerId,
            email: info.email,
            userId: loggedUserId
                ? new mongoose_1.default.Types.ObjectId(loggedUserId)
                : undefined,
            raw: data,
            source: "capture",
            attemptNumber: result.attempts,
            retryHistory: retryHistory.length > 0 ? retryHistory : undefined,
            paypalUserId, // por si quieres auditar
        });
        // Solo actualizar usuario a Premium si el pago fue completado y no es duplicado
        if ((info.status === "COMPLETED" || info.status === "APPROVED") &&
            !saved.idempotent) {
            if (!loggedUserId) {
                console.warn("[PayPal] Pago completado pero no se encontró usuario autenticado para subir a Premium.");
            }
            else {
                // AGREGADO PARA EL VENCIMIENTO
                yield setUserRolePremium({ id: loggedUserId, plan: effectivePlan });
            }
        }
        res.json({
            ok: true,
            status: info.status,
            idempotent: saved.idempotent,
            attempts: result.attempts,
            // AGREGADO PARA EL VENCIMIENTO
            plan: effectivePlan,
            monto: info.value,
            montoEsperado: effectivePlan === 'anual' ? montosConfigurados.anual : montosConfigurados.mensual
        });
        return;
    }
    catch (e) {
        // Error inesperado no manejado por el sistema de reintentos
        console.error("[PayPal] Error inesperado en captureAndUpgrade:", (e === null || e === void 0 ? void 0 : e.message) || e);
        res.status(500).json({
            error: "capture_failed",
            message: "Ocurrió un error inesperado al procesar el pago. Por favor, intenta nuevamente.",
            attempts: 1,
        });
        return;
    }
});
exports.captureAndUpgrade = captureAndUpgrade;
/** POST /api/paypal/webhook  (URL configurada en PayPal) */
const webhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const valid = yield (0, paypal_1.verifyWebhookSignature)(req.headers, req.body);
        if (!valid) {
            res.status(400).json({ error: "invalid_signature" });
            return;
        }
        const event = req.body;
        const eventId = event === null || event === void 0 ? void 0 : event.id;
        const resource = event === null || event === void 0 ? void 0 : event.resource;
        const info = (0, paypal_1.extractPaymentInfo)(resource);
        const userId = (_a = (0, paypal_1.extractUserId)(resource)) !== null && _a !== void 0 ? _a : undefined;
        const saved = yield savePayment({
            eventId,
            orderId: (resource === null || resource === void 0 ? void 0 : resource.id) || ((_c = (_b = resource === null || resource === void 0 ? void 0 : resource.supplementary_data) === null || _b === void 0 ? void 0 : _b.related_ids) === null || _c === void 0 ? void 0 : _c.order_id),
            captureId: info.captureId,
            status: info.status,
            value: info.value,
            currency: info.currency,
            payerId: info.payerId,
            email: info.email,
            userId: userId ? new mongoose_1.default.Types.ObjectId(userId) : undefined,
            raw: event,
            source: "webhook",
            event_type: event === null || event === void 0 ? void 0 : event.event_type,
        });
        // AGREGADO PARA EL VENCIMIENTO
        // El upgrade a Premium ahora se hace únicamente en /api/paypal/capture
        // para evitar sumar días de más cuando también llega el webhook del mismo pago.
        res.json({ ok: true, idempotent: saved.idempotent });
        return;
    }
    catch (e) {
        console.error("[PayPal] Error en webhook:", (e === null || e === void 0 ? void 0 : e.message) || e);
        res.status(500).json({ error: "webhook_failed", message: e === null || e === void 0 ? void 0 : e.message });
        return;
    }
});
exports.webhook = webhook;
