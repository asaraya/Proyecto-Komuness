// Datos de apoyo para los tests de integración: crea un usuario real en la BD
// (authMiddleware lo busca por _id) y una categoría, y devuelve un token válido.
import mongoose from 'mongoose';
import { modelUsuario } from '../../models/usuario.model';
import { modelCategoria } from '../../models/categoria.model';
import { generarToken } from '../../utils/jwt';

export async function crearUsuarioConToken(tipoUsuario = 0) {
    const sufijo = `${Date.now()}_${Math.round(Math.random() * 1e6)}`;
    const usuario = await modelUsuario.create({
        nombre: 'Test',
        apellido: 'User',
        email: `test_${sufijo}@example.com`,
        password: 'TestPassword123',
        tipoUsuario,
        codigo: 'ABC123',
    });
    const token = generarToken({ _id: usuario._id } as any);
    return { usuario, token, auth: `Bearer ${token}` };
}

export async function crearCategoria() {
    return modelCategoria.create({
        nombre: `Categoria test ${Date.now()}_${Math.round(Math.random() * 1e6)}`,
    });
}

export function publicacionDePrueba(categoriaId: mongoose.Types.ObjectId | string) {
    return {
        titulo: 'Test Publicacion',
        contenido: 'This is a test publication content',
        contenidoBreve: 'Test',
        fecha: new Date().toISOString(),
        tag: 'publicacion',
        publicado: true,
        categoria: categoriaId.toString(),
    };
}
