import { describe, expect, test, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { modelUsuario } from '../models/usuario.model';
import { puedeGestionarCuentasRegresivas } from '../utils/cuentaRegresiva';
import { crearUsuarioConToken } from './helpers/testData';

describe('puedeGestionarCuentasRegresivas', () => {
    test('admins siempre; básicos y premium solo con el permiso', () => {
        expect(puedeGestionarCuentasRegresivas({ tipoUsuario: 0 })).toBe(true);
        expect(puedeGestionarCuentasRegresivas({ tipoUsuario: 1 })).toBe(true);
        expect(puedeGestionarCuentasRegresivas({ tipoUsuario: 2 })).toBe(false);
        expect(puedeGestionarCuentasRegresivas({ tipoUsuario: 3, puedeCrearCuentaRegresiva: true })).toBe(true);
        expect(puedeGestionarCuentasRegresivas({ tipoUsuario: '1' as any })).toBe(true);
        expect(puedeGestionarCuentasRegresivas(null)).toBe(false);
        expect(puedeGestionarCuentasRegresivas(undefined)).toBe(false);
    });
});

describe('PUT /api/usuario/:id/cuenta-regresiva', () => {
    const creados: string[] = [];
    let adminAuth: string;
    let basicoAuth: string;
    let basicoId: string;

    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');
        const admin = await crearUsuarioConToken(1);
        const basico = await crearUsuarioConToken(2);
        adminAuth = admin.auth;
        basicoAuth = basico.auth;
        basicoId = String(basico.usuario._id);
        creados.push(String(admin.usuario._id), basicoId);
    });

    afterAll(async () => {
        await modelUsuario.deleteMany({ _id: { $in: creados } });
        await mongoose.connection.close();
    });

    test('admin da el permiso a un básico', async () => {
        const res = await request(app)
            .put(`/api/usuario/${basicoId}/cuenta-regresiva`)
            .set('Authorization', adminAuth)
            .send({ puedeCrearCuentaRegresiva: true });
        expect(res.status).toBe(200);
        expect(res.body.data.puedeCrearCuentaRegresiva).toBe(true);
        expect(res.body.data.password).toBeUndefined();
    });

    test('un básico no puede asignar permisos', async () => {
        const res = await request(app)
            .put(`/api/usuario/${basicoId}/cuenta-regresiva`)
            .set('Authorization', basicoAuth)
            .send({ puedeCrearCuentaRegresiva: true });
        expect(res.status).toBe(403);
    });

    test('valor no booleano → 400', async () => {
        const res = await request(app)
            .put(`/api/usuario/${basicoId}/cuenta-regresiva`)
            .set('Authorization', adminAuth)
            .send({ puedeCrearCuentaRegresiva: 'si' });
        expect(res.status).toBe(400);
    });

    test('usuario inexistente → 404', async () => {
        const res = await request(app)
            .put(`/api/usuario/${new mongoose.Types.ObjectId()}/cuenta-regresiva`)
            .set('Authorization', adminAuth)
            .send({ puedeCrearCuentaRegresiva: false });
        expect(res.status).toBe(404);
    });
});
