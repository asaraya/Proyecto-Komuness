// src/test/publicacionCategoria.test.ts
import { describe, expect, test, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { crearUsuarioConToken, crearCategoria, publicacionDePrueba } from './helpers/testData';

describe('Crear Publicación con Categoría', () => {
    let auth: string;
    let categoriaId: string;

    beforeAll(async () => {
        // Conectar a la BD de pruebas
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb');
        ({ auth } = await crearUsuarioConToken(0));
        categoriaId = (await crearCategoria())._id.toString();
    });

    test('POST /api/publicaciones - Crear publicación con categoría', async () => {
        const response = await request(app)
            .post('/api/publicaciones')
            .set('Authorization', auth)
            .send(publicacionDePrueba(categoriaId));

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
        expect(response.body).toHaveProperty('categoria');
        expect(response.body.categoria).toBe(categoriaId);

        // Limpiar: eliminar la publicación creada
        const responseDelete = await request(app)
            .delete(`/api/publicaciones/${response.body._id}`)
            .set('Authorization', auth);
        expect(responseDelete.status).toBe(200);
    });
});
