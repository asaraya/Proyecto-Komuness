"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.modelPublicacion = void 0;
const mongoose_1 = require("mongoose");
const publicacionExpiration_1 = require("../utils/publicacionExpiration");
//schema comentario
const comentarioSchema = new mongoose_1.Schema({
    autor: {
        _id: String,
        nombre: String,
        apellido: String,
        avatar: String
    },
    contenido: { type: String, required: true },
    fecha: String,
    respuestas: [
        {
            autor: {
                _id: String,
                nombre: String,
                apellido: String,
                avatar: String
            },
            contenido: String,
            fecha: String,
            replyTo: {
                _id: String,
                nombre: String,
                apellido: String
            }
        }
    ]
});
//schema adjunto
const adjuntoSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    key: { type: String, required: true }
}, { _id: true });
const enlaceExternoSchema = new mongoose_1.Schema({
    nombre: { type: String, required: true },
    url: { type: String, required: true }
});
const ubicacionSchema = new mongoose_1.Schema({
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    direccion: { type: String, required: true },
    mapLink: { type: String, required: true }
}, { _id: false });
const publicacionUpdateSchema = new mongoose_1.Schema({
    titulo: { type: String, required: false },
    contenido: { type: String, required: false },
    contenidoBreve: { type: String, required: false },
    fechaEvento: { type: String, required: false },
    horaEvento: { type: String, required: false },
    precio: { type: Number, required: false },
    moneda: { type: String, enum: ['CRC', 'USD'], required: false, default: 'CRC' },
    monedaSimbolo: { type: String, enum: ['₡', '$'], required: false, default: '₡' },
    precioNegociable: { type: Boolean, required: false, default: false },
    precioEstudiante: { type: Number, required: false },
    precioCiudadanoOro: { type: Number, required: false },
    descuento: { type: Number, required: false, default: 0, min: 0, max: 100 },
    enlacesExternos: { type: [enlaceExternoSchema], required: false },
    telefono: { type: String, required: false },
    ubicacion: { type: ubicacionSchema, required: false },
    categoria: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Categoria', required: false },
    adjunto: { type: [adjuntoSchema], required: false },
    requestedAt: { type: String, required: true },
    requestedBy: { type: String, required: true }
}, { _id: false }); // IMPORTANTE: evitar _id duplicados
// Schema para historial de ediciones
const editHistorySchema = new mongoose_1.Schema({
    version: { type: Number, required: true },
    data: { type: mongoose_1.Schema.Types.Mixed, required: true },
    editedAt: { type: String, required: true },
    editedBy: { type: String, required: true },
    approvedBy: { type: String },
    approvedAt: { type: String },
    status: {
        type: String,
        enum: ['approved', 'rejected', 'pending'],
        default: 'pending'
    }
});
const publicacionSchema = new mongoose_1.Schema({
    titulo: { type: String, required: true },
    contenido: { type: String, required: true },
    contenidoBreve: { type: String, required: true },
    // id del autor
    autor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    fecha: { type: String, required: true },
    adjunto: { type: [adjuntoSchema], required: false },
    comentarios: { type: [comentarioSchema], required: false },
    tag: { type: String, required: true },
    publicado: { type: Boolean, required: true },
    // Evento
    fechaEvento: { type: String, required: false },
    horaEvento: { type: String, required: false },
    precio: { type: Number, required: false }, // Precio regular
    moneda: { type: String, enum: ['CRC', 'USD'], required: false, default: 'CRC' },
    monedaSimbolo: { type: String, enum: ['₡', '$'], required: false, default: '₡' },
    precioNegociable: { type: Boolean, required: false, default: false },
    precioEstudiante: { type: Number, required: false },
    precioCiudadanoOro: { type: Number, required: false },
    descuento: { type: Number, required: false, default: 0, min: 0, max: 100 }, // Porcentaje de descuento
    enlacesExternos: { type: [enlaceExternoSchema], required: false },
    telefono: { type: String, required: false },
    fechaExpiracion: { type: Date, required: false, index: true },
    ubicacion: { type: ubicacionSchema, required: false }, // Ubicación del evento
    // categorías de área
    categoria: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Categoria', required: true },
    // CONTROL DE EDICIONES 
    editCount: {
        type: Number,
        default: 0,
        min: 0
    },
    maxEdits: {
        type: Number,
        default: 3
    },
    lastEditRequest: {
        type: String,
        default: null
    },
    pendingUpdate: {
        type: publicacionUpdateSchema,
        default: null
    },
    editHistory: {
        type: [editHistorySchema],
        default: []
    },
    recordatorioEnviado: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    validateBeforeSave: true,
    strict: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
publicacionSchema.pre('save', function (next) {
    var _a;
    this.fechaExpiracion = (_a = (0, publicacionExpiration_1.calculatePublicationExpirationDate)(this)) !== null && _a !== void 0 ? _a : null;
    next();
});
publicacionSchema.virtual('diasRestantes').get(function () {
    return (0, publicacionExpiration_1.calculateRemainingDays)(this.fechaExpiracion);
});
publicacionSchema.virtual('estaCaducada').get(function () {
    const diasRestantes = (0, publicacionExpiration_1.calculateRemainingDays)(this.fechaExpiracion);
    return typeof diasRestantes === 'number' ? diasRestantes === 0 : false;
});
exports.modelPublicacion = (0, mongoose_1.model)('Publicacion', publicacionSchema);
