import request from "supertest";
import app from "../index"; // Asegúrate de importar la instancia de Express
import { modelPublicacion } from "../models/publicacion.model";
import { connectBD } from "../utils/mongodb";
import { crearUsuarioConToken, crearCategoria, publicacionDePrueba } from "./helpers/testData";

describe("Comentarios en Publicaciones", () => {
    let publicacionId: string | null = null;
    let auth: string;

    beforeAll(async () => {
        await connectBD(process.env.BD_URL || "mongodb://localhost:27017/testdb");
        const { usuario, auth: header } = await crearUsuarioConToken(2);
        auth = header;
        const categoria = await crearCategoria();

        // Crear una publicación de prueba antes de ejecutar las pruebas
        const publicacion = await modelPublicacion.create({
            ...publicacionDePrueba(categoria._id),
            autor: usuario._id,
            adjunto: [],
            comentarios: [],
        });

        publicacionId = (publicacion as any)._id.toString();
    });

    afterAll(async () => {
        if (publicacionId) await modelPublicacion.findByIdAndDelete(publicacionId);
    });

    test("Debe agregar un comentario a la publicación", async () => {
        const comentario = {
            contenido: "Este es un comentario de prueba"
        };

        const response = await request(app)
            .post(`/api/publicaciones/${publicacionId}/comentarios`)
            .set("Authorization", auth)
            .send(comentario);

        expect([200, 201]).toContain(response.status);

        // El autor del comentario sale del token, no del body.
        const guardada = await modelPublicacion.findById(publicacionId).lean();
        expect(guardada?.comentarios).toHaveLength(1);
        expect((guardada?.comentarios?.[0] as any).contenido).toBe(comentario.contenido);
        expect((guardada?.comentarios?.[0] as any).autor.nombre).toBe("Test");
    });

    test("Rechaza comentarios sin token", async () => {
        const response = await request(app)
            .post(`/api/publicaciones/${publicacionId}/comentarios`)
            .send({ contenido: "sin login" });

        expect(response.status).toBe(401);
    });

    test("Rechaza comentarios vacíos", async () => {
        const response = await request(app)
            .post(`/api/publicaciones/${publicacionId}/comentarios`)
            .set("Authorization", auth)
            .send({ contenido: "   " });

        expect(response.status).toBe(400);
    });
});
