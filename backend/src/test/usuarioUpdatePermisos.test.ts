import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { modelUsuario } from '../models/usuario.model';
import { comparePassword } from '../utils/bcryptjs';
import { crearUsuarioConToken } from './helpers/testData';

// PUT /api/usuario/:id: solo el propio usuario (o un admin con jerarquía) y solo
// campos de perfil; nunca campos privilegiados como tipoUsuario.
describe('PUT /api/usuario/:id (permisos y allow-list)', () => {
    const creados: string[] = [];
    let basico: Awaited<ReturnType<typeof crearUsuarioConToken>>;
    let otroBasico: Awaited<ReturnType<typeof crearUsuarioConToken>>;
    let admin: Awaited<ReturnType<typeof crearUsuarioConToken>>;
    let otroAdmin: Awaited<ReturnType<typeof crearUsuarioConToken>>;

    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');
        basico = await crearUsuarioConToken(2);
        otroBasico = await crearUsuarioConToken(2);
        admin = await crearUsuarioConToken(1);
        otroAdmin = await crearUsuarioConToken(1);
        creados.push(...[basico, otroBasico, admin, otroAdmin].map((u) => String(u.usuario._id)));
    });

    afterAll(async () => {
        await modelUsuario.deleteMany({ _id: { $in: creados } });
        await mongoose.connection.close();
    });

    test('un básico no puede editar a otro usuario → 403', async () => {
        const res = await request(app)
            .put(`/api/usuario/${otroBasico.usuario._id}`)
            .set('Authorization', basico.auth)
            .send({ nombre: 'Hackeado' });
        expect(res.status).toBe(403);
        const enBd = await modelUsuario.findById(otroBasico.usuario._id);
        expect(enBd?.nombre).toBe('Test');
    });

    test('un básico que envía campos privilegiados sobre sí mismo no los cambia', async () => {
        const res = await request(app)
            .put(`/api/usuario/${basico.usuario._id}`)
            .set('Authorization', basico.auth)
            .send({
                tipoUsuario: 1,
                puedeCrearCuentaRegresiva: true,
                limitePublicaciones: 9999,
                plan: 'anual',
                emailConfirmado: true,
                codigo: 'XXX',
            });
        expect(res.status).toBe(200);
        const enBd: any = await modelUsuario.findById(basico.usuario._id);
        expect(enBd.tipoUsuario).toBe(2);
        expect(enBd.puedeCrearCuentaRegresiva).toBe(false);
        expect(enBd.limitePublicaciones).toBeUndefined();
        expect(enBd.plan).toBeNull();
        expect(enBd.emailConfirmado).toBe(false);
        expect(enBd.codigo).toBe('ABC123');
    });

    test('un básico puede editar un campo de perfil propio → 200', async () => {
        const res = await request(app)
            .put(`/api/usuario/${basico.usuario._id}`)
            .set('Authorization', basico.auth)
            .send({ nombre: 'Nuevo nombre' });
        expect(res.status).toBe(200);
        expect(res.body.nombre).toBe('Nuevo nombre');
        expect(res.body.password).toBeUndefined();
    });

    test('un básico puede cambiar su contraseña y queda hasheada', async () => {
        const res = await request(app)
            .put(`/api/usuario/${basico.usuario._id}`)
            .set('Authorization', basico.auth)
            .send({ password: 'OtraClave456' });
        expect(res.status).toBe(200);
        const enBd: any = await modelUsuario.findById(basico.usuario._id);
        expect(enBd.password).not.toBe('OtraClave456');
        expect(await comparePassword('OtraClave456', enBd.password)).toBe(true);
    });

    test('un básico puede guardar su encuesta de inicio', async () => {
        const res = await request(app)
            .put(`/api/usuario/${basico.usuario._id}`)
            .set('Authorization', basico.auth)
            .send({ encuestaInicio: { rol: 'vendedor', queVende: 'Pan' } });
        expect(res.status).toBe(200);
        expect(res.body.encuestaInicio.rol).toBe('vendedor');
    });

    test('un admin no puede ascender a nadie por esta ruta (usa /membresia)', async () => {
        const res = await request(app)
            .put(`/api/usuario/${otroBasico.usuario._id}`)
            .set('Authorization', admin.auth)
            .send({ tipoUsuario: 1 });
        expect(res.status).toBe(200);
        const enBd: any = await modelUsuario.findById(otroBasico.usuario._id);
        expect(enBd.tipoUsuario).toBe(2);
    });

    test('un admin no puede editar a otro admin → 403', async () => {
        const res = await request(app)
            .put(`/api/usuario/${otroAdmin.usuario._id}`)
            .set('Authorization', admin.auth)
            .send({ password: 'Robada123' });
        expect(res.status).toBe(403);
    });
});
