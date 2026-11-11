import { describe, expect, test, beforeAll } from '@jest/globals';
import request from 'supertest';
import app from '../index';
import { connectBD } from '../utils/mongodb';
import { crearUsuarioConToken, crearCategoria, publicacionDePrueba } from './helpers/testData';

describe('Publicacion Endpoints', () => {
    let auth: string;
    let testPublicacion: ReturnType<typeof publicacionDePrueba>;

    beforeAll(async () => {
        await connectBD(process.env.BD_URL || 'mongodb://localhost:27017/testdb'); // Conectar a la BD
        ({ auth } = await crearUsuarioConToken(0));
        const categoria = await crearCategoria();
        testPublicacion = publicacionDePrueba(categoria._id);
    });

    const crear = () =>
        request(app)
            .post('/api/publicaciones')
            .set('Authorization', auth)
            .send(testPublicacion);

    const borrar = (id: string) =>
        request(app)
            .delete(`/api/publicaciones/${id}`)
            .set('Authorization', auth);

    test('POST /api/publicaciones - Create new publication', async () => {
        const response = await crear();

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('_id');
        const responseDelete = await borrar(response.body._id);
        expect(responseDelete.status).toBe(200);
    });

    test('POST /api/publicaciones - Rechaza sin token', async () => {
        const response = await request(app)
            .post('/api/publicaciones')
            .send(testPublicacion);

        expect(response.status).toBe(401);
    });

    test('GET /api/publicaciones - Get all publications', async () => {
        const response = await request(app)
            .get('/api/publicaciones');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBeTruthy();
        expect(response.body).toHaveProperty('pagination');
    });

    test('GET /api/publicaciones/:id - Get publication by ID', async () => {
        // First create a publication
        const createResponse = await crear();
        const publicacionId = createResponse.body._id;

        const response = await request(app)
            .get(`/api/publicaciones/${publicacionId}`);

        expect(response.status).toBe(200);
        expect(response.body.titulo).toBe(testPublicacion.titulo);
        const responseDelete = await borrar(publicacionId);
        expect(responseDelete.status).toBe(200);
    });

    test('PUT /api/publicaciones/:id - Update publication', async () => {
        // First create a publication
        const createResponse = await crear();
        const publicacionId = createResponse.body._id;
        const updatedData = { ...testPublicacion, titulo: 'Updated Title' };

        const response = await request(app)
            .put(`/api/publicaciones/${publicacionId}`)
            .set('Authorization', auth)
            .send(updatedData);

        expect(response.status).toBe(200);
        expect(response.body.titulo).toBe('Updated Title');
        const responseDelete = await borrar(publicacionId);
        expect(responseDelete.status).toBe(200);
    });

    test('DELETE /api/publicaciones/:id - Delete publication', async () => {
        // First create a publication
        const createResponse = await crear();
        const publicacionId = createResponse.body._id;

        const response = await borrar(publicacionId);

        expect(response.status).toBe(200);

        // Verify the publication was deleted
        const getResponse = await request(app)
            .get(`/api/publicaciones/${publicacionId}`);
        expect(getResponse.status).toBe(404);
    });
});
