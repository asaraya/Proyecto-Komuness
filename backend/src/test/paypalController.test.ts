// src/test/paypalController.test.ts
import { Request, Response } from 'express';
import { captureAndUpgrade } from '../controllers/paypal.controller';
import * as paypalUtils from '../utils/paypal';
import mongoose from 'mongoose';
import { connectBD } from '../utils/mongodb';

// Mock de las utilidades de PayPal
jest.mock('../utils/paypal');

describe('RF016 - PayPal Controller con Reintentos', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  // Configurar MongoDB antes de todos los tests
  beforeAll(async () => {
    const mongoUri = process.env.BD_URL || 'mongodb://localhost:27017/komuness-test';
    await connectBD(mongoUri);
  }, 30000); // Timeout de 30 segundos

  // Cerrar conexión después de todos los tests
  afterAll(async () => {
    await mongoose.connection.close();
  }, 10000);

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
    
    test('Debe procesar pago exitoso en primer intento', async () => {
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
          custom_id: new mongoose.Types.ObjectId().toString(),
        }],
      };
      
      (paypalUtils.captureOrder as jest.Mock).mockResolvedValue(mockPayPalResponse);
      (paypalUtils.extractPaymentInfo as jest.Mock).mockReturnValue({
        captureId: 'CAPTURE_123',
        status: 'COMPLETED',
        value: '4.00',
        currency: 'USD',
        payerId: 'PAYER_123',
        email: 'buyer@example.com',
      });
      (paypalUtils.extractUserId as jest.Mock).mockReturnValue(new mongoose.Types.ObjectId().toString());
      
      await captureAndUpgrade(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );
      
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          status: 'COMPLETED',
          attempts: 1,
        })
      );
      expect(statusMock).not.toHaveBeenCalled(); // 200 por defecto
    });
    
    test('Debe incluir attempts en la respuesta exitosa', async () => {
      mockRequest.body = { orderId: 'ORDER_SUCCESS_2' };
      
      (paypalUtils.captureOrder as jest.Mock).mockResolvedValue({ id: 'CAP_123' });
      (paypalUtils.extractPaymentInfo as jest.Mock).mockReturnValue({
        captureId: 'CAP_123',
        status: 'COMPLETED',
      });
      (paypalUtils.extractUserId as jest.Mock).mockReturnValue(null);
      
      await captureAndUpgrade(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );
      
      const response = jsonMock.mock.calls[0][0];
      expect(response).toHaveProperty('attempts');
      expect(response.attempts).toBeGreaterThanOrEqual(1);
    });
  });

  describe('captureAndUpgrade - Validación de Entrada', () => {
    
    test('Debe retornar error 400 si orderId no está presente', async () => {
      mockRequest.body = {};
      
      await captureAndUpgrade(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'orderId requerido',
        })
      );
    });
    
    test('Debe retornar error 400 si orderId es null', async () => {
      mockRequest.body = { orderId: null };
      
      await captureAndUpgrade(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );
      
      expect(statusMock).toHaveBeenCalledWith(400);
    });
    
    test('Debe retornar error 400 si orderId es undefined', async () => {
      mockRequest.body = { orderId: undefined };
      
      await captureAndUpgrade(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );
      
      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('captureAndUpgrade - Errores No Recuperables', () => {
    
    test('Debe fallar inmediatamente con fondos insuficientes (sin reintentos)', async () => {
      mockRequest.body = { orderId: 'ORDER_INSUFFICIENT_FUNDS' };
      
      (paypalUtils.captureOrder as jest.Mock).mockRejectedValue({
        message: 'Insufficient funds in account',
        // No incluir statusCode para que use el mapeado por PaymentErrorHandler
      });
      
      await captureAndUpgrade(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );
      
      // Debe llamar captureOrder solo 1 vez (no reintenta)
      expect(paypalUtils.captureOrder).toHaveBeenCalledTimes(1);
      
      // Debe retornar error con código HTTP apropiado
      expect(statusMock).toHaveBeenCalledWith(402);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'INSUFFICIENT_FUNDS',
          message: expect.stringContaining('Fondos insuficientes'),
          canRetry: false,
          attempts: 1,
        })
      );
    });
    
    test('Debe incluir mensaje amigable para tarjeta inválida', async () => {
      mockRequest.body = { orderId: 'ORDER_INVALID_CARD' };
      
      (paypalUtils.captureOrder as jest.Mock).mockRejectedValue({
        message: 'Invalid card number',
        statusCode: 400,
      });
      
      await captureAndUpgrade(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );
      
      const response = jsonMock.mock.calls[0][0];
      expect(response.message).toContain('Tarjeta');
      expect(response.message).toContain('inválida');
    });
    
    test('NO debe exponer detalles técnicos en errores', async () => {
      mockRequest.body = { orderId: 'ORDER_ERROR' };
      
      (paypalUtils.captureOrder as jest.Mock).mockRejectedValue({
        message: 'INTERNAL_SERVER_ERROR: Database connection failed',
        stack: 'Error: at line 123...',
        statusCode: 500,
      });
      
      await captureAndUpgrade(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );
      
      const response = jsonMock.mock.calls[0][0];
      expect(response.message).not.toContain('Database');
      expect(response.message).not.toContain('INTERNAL_SERVER_ERROR');
      expect(response).not.toHaveProperty('stack');
    });
  });

  describe('captureAndUpgrade - Estructura de Respuestas', () => {
    
    test('Respuesta exitosa debe tener estructura correcta', async () => {
      mockRequest.body = { orderId: 'ORDER_OK' };
      
      (paypalUtils.captureOrder as jest.Mock).mockResolvedValue({ id: 'CAP' });
      (paypalUtils.extractPaymentInfo as jest.Mock).mockReturnValue({
        captureId: 'CAP',
        status: 'COMPLETED',
      });
      (paypalUtils.extractUserId as jest.Mock).mockReturnValue(null);
      
      await captureAndUpgrade(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );
      
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
    });
    
    test('Respuesta de error debe tener estructura correcta', async () => {
      mockRequest.body = { orderId: 'ORDER_ERR' };
      
      (paypalUtils.captureOrder as jest.Mock).mockRejectedValue({
        message: 'Insufficient funds',
        statusCode: 400,
      });
      
      await captureAndUpgrade(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );
      
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
    });
  });

  // Los console.log del controller se eliminaron a propósito (commit 9d44084)
  // para no exponer información de pagos en producción.
  describe('captureAndUpgrade - Logging', () => {

    test('No debe exponer el orderId en los logs', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockRequest.body = { orderId: 'ORDER_LOG_TEST' };

      (paypalUtils.captureOrder as jest.Mock).mockResolvedValue({ id: 'CAP' });
      (paypalUtils.extractPaymentInfo as jest.Mock).mockReturnValue({
        captureId: 'CAP',
        status: 'COMPLETED',
      });
      (paypalUtils.extractUserId as jest.Mock).mockReturnValue(null);

      await captureAndUpgrade(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );

      const logs = consoleLogSpy.mock.calls.flat().map(String).join('\n');
      expect(logs).not.toContain('ORDER_LOG_TEST');

      consoleLogSpy.mockRestore();
    });

    test('No debe exponer el captureId en los logs tras una captura exitosa', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      mockRequest.body = { orderId: 'ORDER_SUCCESS_LOG' };

      (paypalUtils.captureOrder as jest.Mock).mockResolvedValue({ id: 'CAP_SECRETO' });
      (paypalUtils.extractPaymentInfo as jest.Mock).mockReturnValue({
        captureId: 'CAP_SECRETO',
        status: 'COMPLETED',
      });
      (paypalUtils.extractUserId as jest.Mock).mockReturnValue(null);

      await captureAndUpgrade(
        mockRequest as Request,
        mockResponse as Response,
        jest.fn()
      );

      const logs = consoleLogSpy.mock.calls.flat().map(String).join('\n');
      expect(logs).not.toContain('ORDER_SUCCESS_LOG');
      expect(logs).not.toContain('CAP_SECRETO');

      consoleLogSpy.mockRestore();
    });
  });
});
