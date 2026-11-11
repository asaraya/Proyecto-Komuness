import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { modelUsuario } from '../models/usuario.model';

// Evita que el registro intente enviar correos reales durante los tests
jest.mock('nodemailer', () => ({
    createTransport: () => ({
        sendMail: jest.fn(() => Promise.resolve(true)),
    }),
}));

jest.setTimeout(30000);

// Usuarios de prueba: uno admin (tipoUsuario 0 o 1) y uno normal (tipoUsuario distinto)
const adminEmail = `admin_config_${Date.now()}@example.com`;
const normalEmail = `user_config_${Date.now()}@example.com`;

const adminUser = {
    nombre: 'Admin',
    apellido: 'Config',
    email: adminEmail,
    password: 'TestPassword123',
    tipoUsuario: 0,
    codigo: 'ABC123',
};

const normalUser = {
    nombre: 'Normal',
    apellido: 'Config',
    email: normalEmail,
    password: 'TestPassword123',
    tipoUsuario: 2, // Ajustar si tu enum de roles usa otro valor para "no-admin"
    codigo: 'ABC123',
};

let adminToken: string;
let normalToken: string;
let adminId: string;
let normalId: string;

describe('Configuracion Endpoints (Inicio)', () => {
    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');

        const adminRes = await request(app).post('/api/usuario/register').send(adminUser);
        adminId = adminRes.body.user._id;
        // El registro deja emailConfirmado: false; se fuerza la confirmación
        // directo en BD para poder loguear en el test (no hay servidor de correo real aquí).
        await modelUsuario.findByIdAndUpdate(adminId, { emailConfirmado: true });
        const adminLogin = await request(app)
            .post('/api/usuario/login')
            .send({ email: adminUser.email, password: adminUser.password });
        adminToken = adminLogin.body.token;

        const normalRes = await request(app).post('/api/usuario/register').send(normalUser);
        normalId = normalRes.body.user._id;
        await modelUsuario.findByIdAndUpdate(normalId, { emailConfirmado: true });
        const normalLogin = await request(app)
            .post('/api/usuario/login')
            .send({ email: normalUser.email, password: normalUser.password });
        normalToken = normalLogin.body.token;
    }, 30000);

    afterAll(async () => {
        await request(app).delete(`/api/usuario/${adminId}`).set('Authorization', `Bearer ${adminToken}`);
        await request(app).delete(`/api/usuario/${normalId}`).set('Authorization', `Bearer ${adminToken}`);
        await mongoose.connection.close();
    }, 15000);

    // ---------- inicio-contenido ----------
    describe('GET/PUT /api/configuracion/inicio-contenido', () => {
        test('GET público - responde 200 con success y data.eslogan/frase', async () => {
            const res = await request(app).get('/api/configuracion/inicio-contenido');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('eslogan');
            expect(res.body.data).toHaveProperty('frase');
        });

        test('PUT sin token - responde 401', async () => {
            const res = await request(app)
                .put('/api/configuracion/inicio-contenido')
                .send({ eslogan: 'Nuevo eslogan', frase: 'Nueva frase de inicio' });
            expect(res.status).toBe(401);
        });

        test('PUT con usuario sin rol admin - responde 403', async () => {
            const res = await request(app)
                .put('/api/configuracion/inicio-contenido')
                .set('Authorization', `Bearer ${normalToken}`)
                .send({ eslogan: 'Nuevo eslogan', frase: 'Nueva frase de inicio' });
            expect(res.status).toBe(403);
        });

        test('PUT sin eslogan ni frase - responde 400', async () => {
            const res = await request(app)
                .put('/api/configuracion/inicio-contenido')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({});
            expect(res.status).toBe(400);
        });

        test('PUT con usuario admin - responde 200 y persiste el cambio', async () => {
            const nuevoContenido = {
                eslogan: 'Eslogan actualizado por test',
                frase: 'Frase de inicio actualizada por test',
            };
            const res = await request(app)
                .put('/api/configuracion/inicio-contenido')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(nuevoContenido);
            expect(res.status).toBe(200);
            expect(res.body.data.eslogan).toBe(nuevoContenido.eslogan);
            expect(res.body.data.frase).toBe(nuevoContenido.frase);

            const getRes = await request(app).get('/api/configuracion/inicio-contenido');
            expect(getRes.status).toBe(200);
            expect(getRes.body.data.eslogan).toBe(nuevoContenido.eslogan);
            expect(getRes.body.data.frase).toBe(nuevoContenido.frase);
        });
    });

    // ---------- frase-inicio ----------
    describe('GET/PUT /api/configuracion/frase-inicio', () => {
        test('GET público - responde 200 con success y data.frase', async () => {
            const res = await request(app).get('/api/configuracion/frase-inicio');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('frase');
        });

        test('PUT sin token - responde 401', async () => {
            const res = await request(app)
                .put('/api/configuracion/frase-inicio')
                .send({ frase: 'Nueva frase' });
            expect(res.status).toBe(401);
        });

        test('PUT con frase vacía - responde 400', async () => {
            const res = await request(app)
                .put('/api/configuracion/frase-inicio')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ frase: '   ' });
            expect(res.status).toBe(400);
        });

        test('PUT con frase de más de 280 caracteres - responde 400', async () => {
            const res = await request(app)
                .put('/api/configuracion/frase-inicio')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ frase: 'a'.repeat(281) });
            expect(res.status).toBe(400);
        });

        test('PUT con usuario admin - responde 200 y persiste el cambio', async () => {
            const nuevaFrase = 'Frase actualizada por test';
            const res = await request(app)
                .put('/api/configuracion/frase-inicio')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ frase: nuevaFrase });
            expect(res.status).toBe(200);
            expect(res.body.data.frase).toBe(nuevaFrase);

            const getRes = await request(app).get('/api/configuracion/frase-inicio');
            expect(getRes.body.data.frase).toBe(nuevaFrase);
        });
    });

    // ---------- tematica ----------
    describe('GET/PUT /api/configuracion/tematica', () => {
        test('GET público - responde 200 con success y data.theme', async () => {
            const res = await request(app).get('/api/configuracion/tematica');
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('theme');
            expect(res.body.data).toHaveProperty('date');
        });

        test('GET /tematica/admin sin token - responde 401', async () => {
            const res = await request(app).get('/api/configuracion/tematica/admin');
            expect(res.status).toBe(401);
        });

        test('GET /tematica/admin con admin - responde 200 con config completo', async () => {
            const res = await request(app)
                .get('/api/configuracion/tematica/admin')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveProperty('config');
            expect(res.body.data).toHaveProperty('effectiveTheme');
        });

        test('PUT sin token - responde 401', async () => {
            const res = await request(app)
                .put('/api/configuracion/tematica')
                .send({ programadas: [] });
            expect(res.status).toBe(401);
        });

        test('PUT con usuario sin rol admin - responde 403', async () => {
            const res = await request(app)
                .put('/api/configuracion/tematica')
                .set('Authorization', `Bearer ${normalToken}`)
                .send({ programadas: [] });
            expect(res.status).toBe(403);
        });

        test('PUT con más de 60 temas programados - responde 400', async () => {
            const programadas = Array.from({ length: 61 }, (_, i) => ({ id: `tema-${i}` }));
            const res = await request(app)
                .put('/api/configuracion/tematica')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ programadas });
            expect(res.status).toBe(400);
        });

        test('PUT con usuario admin - responde 200', async () => {
            const res = await request(app)
                .put('/api/configuracion/tematica')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ programadas: [] });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveProperty('effectiveTheme');
        });
    });
});