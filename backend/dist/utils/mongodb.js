"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectBD = connectBD;
const node_dns_1 = __importDefault(require("node:dns"));
const mongoose_1 = __importDefault(require("mongoose"));
let isConnected = false;
let dnsConfigured = false;
function connectBD(url) {
    return __awaiter(this, void 0, void 0, function* () {
        if (isConnected)
            return;
        if (!url)
            throw new Error('❌ MongoDB URI no proporcionada');
        if (!dnsConfigured) {
            node_dns_1.default.setServers(['1.1.1.1', '8.8.8.8']);
            dnsConfigured = true;
        }
        try {
            yield mongoose_1.default.connect(url, {
                serverSelectionTimeoutMS: 30000,
                connectTimeoutMS: 30000,
            });
            isConnected = true;
            console.log('✅ Conectado a MongoDB');
        }
        catch (error) {
            console.error('❌ Error de conexión a MongoDB:', error);
            throw error;
        }
    });
}
