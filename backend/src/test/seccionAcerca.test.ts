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

const adminEmail = `admin_acerca_${Date.now()}@example.com`;
const normalEmail = `user_acerca_${Date.now()}@example.com`;

const adminUser = {
    nombre: 'Admin',
    apellido: 'Acerca',
    email: adminEmail,
    password: 'TestPassword123',
    tipoUsuario: 0,
    codigo: 'ABC123',
};

const normalUser = {
    nombre: 'Normal',
    apellido: 'Acerca',
    email: normalEmail,
    password: 'TestPassword123',
    tipoUsuario: 2, 
    codigo: 'ABC123',
};

let adminToken: string;
let normalToken: string;
let adminId: string;
let normalId: string;

describe('Seccion Acerca de Endpoints (Inicio)', () => {
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

    test('GET /api/acerca-de - público, responde 200 y un objeto', async () => {
        const res = await request(app).get('/api/acerca-de');
        expect(res.status).toBe(200);
        expect(typeof res.body).toBe('object');
    });

    test('PUT /api/acerca-de sin token - responde 401', async () => {
        const res = await request(app)
            .put('/api/acerca-de')
            .send({ contenido: 'Nuevo contenido acerca de' });
        expect(res.status).toBe(401);
    });

    test('PUT /api/acerca-de con usuario sin rol admin - responde 403', async () => {
        const res = await request(app)
            .put('/api/acerca-de')
            .set('Authorization', `Bearer ${normalToken}`)
            .send({ contenido: 'Nuevo contenido acerca de' });
        expect(res.status).toBe(403);
    });

    test('PUT /api/acerca-de con usuario admin - responde 200 y persiste el cambio', async () => {
        const nuevoContenido = { contenido: 'Contenido actualizado por test' };
        const res = await request(app)
            .put('/api/acerca-de')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(nuevoContenido);
        expect(res.status).toBe(200);

        const getRes = await request(app).get('/api/acerca-de');
        expect(getRes.status).toBe(200);
        expect(getRes.body.contenido).toBe(nuevoContenido.contenido);
    });

    test('PUT /api/acerca-de sin titulo ni contenido - responde 400', async () => {
        const res = await request(app)
            .put('/api/acerca-de')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ historia: 'Solo historia, sin titulo ni contenido' });
        expect(res.status).toBe(400);
    });

    test('GET /api/acerca-de - incluye estructura de contactos e informacionDonaciones', async () => {
        const res = await request(app).get('/api/acerca-de');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('contactos');
        expect(res.body).toHaveProperty('informacionDonaciones');
        expect(res.body).toHaveProperty('equipo');
    });

});