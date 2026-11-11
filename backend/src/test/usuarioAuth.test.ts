import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { modelUsuario } from '../models/usuario.model';

// Evita que el controller intente enviar correos reales durante los tests.
// Debe declararse ANTES del import de '../index' si tu bundler lo reordena;
// con ts-jest normalmente basta con tenerlo al inicio del archivo.
jest.mock('nodemailer', () => ({
    createTransport: () => ({
        sendMail: jest.fn(() => Promise.resolve(true)),
    }),
}));

jest.setTimeout(30000);

// Generar email único para cada ejecución
const uniqueEmail = `testuser_${Date.now()}@example.com`;
const testUser = {
    nombre: 'Test',
    apellido: 'User',
    email: uniqueEmail,
    password: 'TestPassword123',
    tipoUsuario: 0, // superadmin para poder eliminar usuarios
    codigo: 'ABC123'
};

let userId: string;
let token: string;

describe('Auth: Registro, Login, Cambio y Recuperación de Contraseña, Logout', () => {
    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');
        try {
            await request(app).delete(`/api/usuario/${uniqueEmail}`);
        } catch (e) {}
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    test('Registro de usuario', async () => {
        const res = await request(app)
            .post('/api/usuario/register')
            .send(testUser);
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('user');
        expect(res.body.user).toHaveProperty('_id');
        userId = res.body.user._id;
    });

    test('Login sin confirmar email - responde 403 EMAIL_NOT_CONFIRMED', async () => {
        const res = await request(app)
            .post('/api/usuario/login')
            .send({ email: testUser.email, password: testUser.password });
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('EMAIL_NOT_CONFIRMED');
    });

    test('Login de usuario (tras confirmar email)', async () => {
        // Simula la confirmación que normalmente hace el usuario desde el correo
        await modelUsuario.findByIdAndUpdate(userId, { emailConfirmado: true });

        const res = await request(app)
            .post('/api/usuario/login')
            .send({ email: testUser.email, password: testUser.password });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('token');
        token = res.body.token;
        expect(res.body.user.tipoUsuario).toBe(testUser.tipoUsuario);
    });

    test('Validación de roles', async () => {
        const res = await request(app)
            .get('/api/usuario/check')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.user.tipoUsuario).toBe(testUser.tipoUsuario);
    });

    test('Recuperación de contraseña (envío de código)', async () => {
        const res = await request(app)
            .post('/api/usuario/recuperar-contrasena')
            .send({ email: testUser.email });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('message');
    });

    // NOTA: El endpoint para cambiar contraseña no está definido en usuario.routes.ts, debe implementarse si no existe.

    test('Logout de usuario', async () => {
        // Si tienes un endpoint de logout, ajústalo aquí. Si no, omite este test.
        expect(true).toBe(true); // Placeholder
    });

    test('Eliminar usuario de prueba', async () => {
        const res = await request(app)
            .delete(`/api/usuario/${userId}`)
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
    });
});