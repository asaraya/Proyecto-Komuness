import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import { PantallaInicio } from "./PantallaInicio";
import { LandingPage } from "./landingPage";
import { PerfilUsuario } from "./perfilUsuario";
import { PublicacionDetalle } from "./publicacionDetalle";
import { Navbar } from "./navbar";
import { Biblioteca } from "./biblioteca";

import { IniciarSesion } from "./iniciarSesion";
import { RecuperarContra } from "./recuperarContra";
import { NuevaContra } from "./nuevaContra";
import { CrearUsuario } from "./crearUsuario";
import AdminCategorias from "./adminCategorias";
import AdminCuentasRegresivas from "./adminCuentasRegresivas";
import AdminBoletines from "./adminBoletines";
import Footer from "./Footer";
import CheckoutPremium from "./CheckoutPremium";
import PerfilPublico from "./PerfilPublico";
import EditarPerfil from "./EditarPerfil";
import BancoProfesionales from "./BancoProfesionales";
import TerminosCondiciones from "./TerminosCondiciones"; // NUEVO
import Tutoriales from "./tutoriales"; // NUEVO
import ProyectosDestacados from "./proyectosDestacados"; // NUEVO
import NotificacionesMovil from "./notificaciones/NotificacionesMovil";
import EncuestaInicioModal from "./EncuestaInicioModal";

export const Rutas = () => {
  return (
    <Router>
      <Navbar />
      <EncuestaInicioModal />
      <Routes>
        <Route path="/" element={<PantallaInicio />} />
        <Route path="/eventos" element={<LandingPage tag="evento" />} />
        <Route
          path="/publicaciones"
          element={<LandingPage tag="publicacion" />}
        />
        <Route path="/publicaciones/:id" element={<PublicacionDetalle />} />
        <Route path="/eventos/:id" element={<PublicacionDetalle />} />
        <Route path="/emprendimientos/:id" element={<PublicacionDetalle />} />
        <Route
          path="/emprendimientos"
          element={<LandingPage tag="emprendimiento" />}
        />
        <Route path="/biblioteca/:id" element={<Biblioteca />} />
        <Route path="/perfilUsuario" element={<PerfilUsuario />} />
        <Route path="/iniciarSesion" element={<IniciarSesion />} />
        <Route path="/recuperar" element={<RecuperarContra />} />
        <Route path="/nuevaCont" element={<NuevaContra />} />
        <Route path="/crearUsr" element={<CrearUsuario />} />
        <Route path="/calendario" element={<Navigate to="/eventos" replace />} />
        <Route path="/admin/categorias" element={<AdminCategorias />} />
        <Route path="/cuentas-regresivas" element={<AdminCuentasRegresivas />} />
        <Route path="/admin/boletines" element={<AdminBoletines />} />
        {/* "Quiénes somos" y su edición viven ahora en "/" (botón "Editar
            página de inicio" para administración). La ruta vieja redirige. */}
        <Route path="/admin/acerca-de" element={<Navigate to="/" replace />} />
        <Route path="/acerca-de" element={<Navigate to="/#quienes-somos" replace />} />
        <Route path="/checkout-premium" element={<CheckoutPremium />} />
        <Route path="/perfil/:id" element={<PerfilPublico />} />
        <Route path="/mi-perfil/editar" element={<EditarPerfil />} />
        <Route path="/profesionales" element={<BancoProfesionales />} />
        <Route
          path="/terminos-y-condiciones"
          element={<TerminosCondiciones />}
        />{" "}
        {/* NUEVO */}
        <Route path="/tutoriales" element={<Tutoriales />} /> {/* NUEVO */}
        <Route
          path="/proyectos-destacados"
          element={<ProyectosDestacados />}
        />{" "}
        {/* NUEVO */}
        <Route path="/notificaciones" element={<NotificacionesMovil />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Footer />
    </Router>
  );
};
