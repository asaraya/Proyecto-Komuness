"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const paypal_controller_1 = require("../controllers/paypal.controller");
const paypalUtils = __importStar(require("../utils/paypal"));
const mongoose_1 = __importDefault(require("mongoose"));
const mongodb_1 = require("../utils/mongodb");
// Mock de las utilidades de PayPal
jest.mock('../utils/paypal');
describe('RF016 - PayPal Controller con Reintentos', () => {
    let mockRequest;
    let mockResponse;
    let jsonMock;
    let statusMock;
    // Configurar MongoDB antes de todos los tests
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        const mongoUri = process.env.BD_URL || 'mongodb://localhost:27017/komuness-test';
        yield (0, mongodb_1.connectBD)(mongoUri);
    }), 30000); // Timeout de 30 segundos
    // Cerrar conexión después de todos los tests
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        yield mongoose_1.default.connection.close();
    }), 10000);
    beforeEach(() => {
        jsonMock = jest.fn();
        statusMock = jest.fn().mockReturnValue({ json: jsonMock });
        mockRequest = {
            body: {},
        };
        mockResponse = {
            json: jsonMock,
            status: statusMock,
        };
        jest.clearAllMocks();
    });
    describe('captureAndUpgrade - Escenarios de Éxito', () => {
        test('Debe procesar pago exitoso en primer intento', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = { orderId: 'ORDER_SUCCESS_1' };
            const mockPayPalResponse = {
                id: 'CAPTURE_123',
                status: 'COMPLETED',
                purchase_units: [{
                        amount: { value: '4.00', currency_code: 'USD' },
                        payments: {
                            captures: [{
                                    id: 'CAPTURE_123',
                                    status: 'COMPLETED',
                                }]
                        },
                        payee: { email_address: 'buyer@example.com' },
                        payer: { payer_id: 'PAYER_123' },
                        custom_id: new mongoose_1.default.Types.ObjectId().toString(),
                    }],
            };
            paypalUtils.captureOrder.mockResolvedValue(mockPayPalResponse);
            paypalUtils.extractPaymentInfo.mockReturnValue({
                captureId: 'CAPTURE_123',
                status: 'COMPLETED',
                value: '4.00',
                currency: 'USD',
                payerId: 'PAYER_123',
                email: 'buyer@example.com',
            });
            paypalUtils.extractUserId.mockReturnValue(new mongoose_1.default.Types.ObjectId().toString());
            yield (0, paypal_controller_1.captureAndUpgrade)(mockRequest, mockResponse, jest.fn());
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                ok: true,
                status: 'COMPLETED',
                attempts: 1,
            }));
            expect(statusMock).not.toHaveBeenCalled(); // 200 por defecto
        }));
        test('Debe incluir attempts en la respuesta exitosa', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = { orderId: 'ORDER_SUCCESS_2' };
            paypalUtils.captureOrder.mockResolvedValue({ id: 'CAP_123' });
            paypalUtils.extractPaymentInfo.mockReturnValue({
                captureId: 'CAP_123',
                status: 'COMPLETED',
            });
            paypalUtils.extractUserId.mockReturnValue(null);
            yield (0, paypal_controller_1.captureAndUpgrade)(mockRequest, mockResponse, jest.fn());
            const response = jsonMock.mock.calls[0][0];
            expect(response).toHaveProperty('attempts');
            expect(response.attempts).toBeGreaterThanOrEqual(1);
        }));
    });
    describe('captureAndUpgrade - Validación de Entrada', () => {
        test('Debe retornar error 400 si orderId no está presente', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = {};
            yield (0, paypal_controller_1.captureAndUpgrade)(mockRequest, mockResponse, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(400);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: 'orderId requerido',
            }));
        }));
        test('Debe retornar error 400 si orderId es null', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = { orderId: null };
            yield (0, paypal_controller_1.captureAndUpgrade)(mockRequest, mockResponse, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(400);
        }));
        test('Debe retornar error 400 si orderId es undefined', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = { orderId: undefined };
            yield (0, paypal_controller_1.captureAndUpgrade)(mockRequest, mockResponse, jest.fn());
            expect(statusMock).toHaveBeenCalledWith(400);
        }));
    });
    describe('captureAndUpgrade - Errores No Recuperables', () => {
        test('Debe fallar inmediatamente con fondos insuficientes (sin reintentos)', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = { orderId: 'ORDER_INSUFFICIENT_FUNDS' };
            paypalUtils.captureOrder.mockRejectedValue({
                message: 'Insufficient funds in account',
                // No incluir statusCode para que use el mapeado por PaymentErrorHandler
            });
            yield (0, paypal_controller_1.captureAndUpgrade)(mockRequest, mockResponse, jest.fn());
            // Debe llamar captureOrder solo 1 vez (no reintenta)
            expect(paypalUtils.captureOrder).toHaveBeenCalledTimes(1);
            // Debe retornar error con código HTTP apropiado
            expect(statusMock).toHaveBeenCalledWith(402);
            expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({
                error: 'INSUFFICIENT_FUNDS',
                message: expect.stringContaining('Fondos insuficientes'),
                canRetry: false,
                attempts: 1,
            }));
        }));
        test('Debe incluir mensaje amigable para tarjeta inválida', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = { orderId: 'ORDER_INVALID_CARD' };
            paypalUtils.captureOrder.mockRejectedValue({
                message: 'Invalid card number',
                statusCode: 400,
            });
            yield (0, paypal_controller_1.captureAndUpgrade)(mockRequest, mockResponse, jest.fn());
            const response = jsonMock.mock.calls[0][0];
            expect(response.message).toContain('Tarjeta');
            expect(response.message).toContain('inválida');
        }));
        test('NO debe exponer detalles técnicos en errores', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = { orderId: 'ORDER_ERROR' };
            paypalUtils.captureOrder.mockRejectedValue({
                message: 'INTERNAL_SERVER_ERROR: Database connection failed',
                stack: 'Error: at line 123...',
                statusCode: 500,
            });
            yield (0, paypal_controller_1.captureAndUpgrade)(mockRequest, mockResponse, jest.fn());
            const response = jsonMock.mock.calls[0][0];
            expect(response.message).not.toContain('Database');
            expect(response.message).not.toContain('INTERNAL_SERVER_ERROR');
            expect(response).not.toHaveProperty('stack');
        }));
    });
    describe('captureAndUpgrade - Estructura de Respuestas', () => {
        test('Respuesta exitosa debe tener estructura correcta', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = { orderId: 'ORDER_OK' };
            paypalUtils.captureOrder.mockResolvedValue({ id: 'CAP' });
            paypalUtils.extractPaymentInfo.mockReturnValue({
                captureId: 'CAP',
                status: 'COMPLETED',
            });
            paypalUtils.extractUserId.mockReturnValue(null);
            yield (0, paypal_controller_1.captureAndUpgrade)(mockRequest, mockResponse, jest.fn());
            const response = jsonMock.mock.calls[0][0];
            // Verificar estructura
            expect(response).toHaveProperty('ok');
            expect(response).toHaveProperty('status');
            expect(response).toHaveProperty('idempotent');
            expect(response).toHaveProperty('attempts');
            // Verificar tipos
            expect(typeof response.ok).toBe('boolean');
            expect(typeof response.status).toBe('string');
            expect(typeof response.idempotent).toBe('boolean');
            expect(typeof response.attempts).toBe('number');
        }));
        test('Respuesta de error debe tener estructura correcta', () => __awaiter(void 0, void 0, void 0, function* () {
            mockRequest.body = { orderId: 'ORDER_ERR' };
            paypalUtils.captureOrder.mockRejectedValue({
                message: 'Insufficient funds',
                statusCode: 400,
            });
            yield (0, paypal_controller_1.captureAndUpgrade)(mockRequest, mockResponse, jest.fn());
            const response = jsonMock.mock.calls[0][0];
            // Verificar estructura
            expect(response).toHaveProperty('error');
            expect(response).toHaveProperty('message');
            expect(response).toHaveProperty('canRetry');
            expect(response).toHaveProperty('attempts');
            // Verificar tipos
            expect(typeof response.error).toBe('string');
            expect(typeof response.message).toBe('string');
            expect(typeof response.canRetry).toBe('boolean');
            expect(typeof response.attempts).toBe('number');
            // Verificar que message es amigable
            expect(response.message.length).toBeGreaterThan(0);
            expect(response.message).not.toContain('undefined');
        }));
    });
    describe('captureAndUpgrade - Logging', () => {
        test('Debe loggear inicio de captura', () => __awaiter(void 0, void 0, void 0, function* () {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            mockRequest.body = { orderId: 'ORDER_LOG_TEST' };
            paypalUtils.captureOrder.mockResolvedValue({ id: 'CAP' });
            paypalUtils.extractPaymentInfo.mockReturnValue({
                captureId: 'CAP',
                status: 'COMPLETED',
            });
            paypalUtils.extractUserId.mockReturnValue(null);
            yield (0, paypal_controller_1.captureAndUpgrade)(mockRequest, mockResponse, jest.fn());
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('[PayPal] Iniciando captura'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('ORDER_LOG_TEST'));
            consoleLogSpy.mockRestore();
        }));
        test('Debe loggear captura exitosa con número de intentos', () => __awaiter(void 0, void 0, void 0, function* () {
            const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
            mockRequest.body = { orderId: 'ORDER_SUCCESS_LOG' };
            paypalUtils.captureOrder.mockResolvedValue({ id: 'CAP' });
            paypalUtils.extractPaymentInfo.mockReturnValue({
                captureId: 'CAP',
                status: 'COMPLETED',
            });
            paypalUtils.extractUserId.mockReturnValue(null);
            yield (0, paypal_controller_1.captureAndUpgrade)(mockRequest, mockResponse, jest.fn());
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Captura exitosa'));
            expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('intento(s)'));
            consoleLogSpy.mockRestore();
        }));
    });
});
