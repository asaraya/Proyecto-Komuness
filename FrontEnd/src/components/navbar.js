import React, { useCallback, useEffect, useState } from "react";
import "../CSS/navbar.css";
import { AiOutlineUser, AiOutlineMenu, AiOutlineClose } from "react-icons/ai";
import { FaUsers } from "react-icons/fa";
import { toast } from "react-hot-toast";
import logo from "../images/logo.png";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { API_URL } from "../utils/api";
import Notificaciones from "../components/notificaciones/notificaciones.js";

const MOBILE_BREAKPOINT = 768;

export const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [menuAbierto, setMenuAbierto] = useState(false);
  const [open, setOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [lastToastCount, setLastToastCount] = useState(0);
  const [isMobileView, setIsMobileView] = useState(
    () => window.innerWidth <= MOBILE_BREAKPOINT,
  );

  let usuario = null;
  try {
    usuario = JSON.parse(localStorage.getItem("user"));
  } catch (_err) {
    usuario = null;
  }

  const goToLogin = usuario !== null;

  useEffect(() => {
    setMenuAbierto(false);
  }, [location.pathname]);

  useEffect(() => {
    if (menuAbierto) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [menuAbierto]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const obtenerCantidadNotificaciones = useCallback(async () => {
    const token = localStorage.getItem("token");

    let user = null;
    try {
      user = JSON.parse(localStorage.getItem("user"));
    } catch (_err) {
      user = null;
    }

    if (!token || !user?._id) {
      setNotificationCount(0);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/notificaciones?onlyUnread=true`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("No se pudieron obtener notificaciones");
      }

      const payload = await res.json();
      const total = Array.isArray(payload?.data) ? payload.data.length : 0;
      setNotificationCount(total);
    } catch (error) {
      console.error("Error al obtener cantidad de notificaciones:", error);
    }
  }, []);

  useEffect(() => {
    obtenerCantidadNotificaciones();
  }, [obtenerCantidadNotificaciones, location.pathname, open]);

  useEffect(() => {
    const intervalId = setInterval(obtenerCantidadNotificaciones, 30000);
    return () => clearInterval(intervalId);
  }, [obtenerCantidadNotificaciones]);

  useEffect(() => {
    const onFocus = () => obtenerCantidadNotificaciones();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [obtenerCantidadNotificaciones]);

  useEffect(() => {
    const handler = (event) => {
      const nextCount = Number(event?.detail);
      if (Number.isFinite(nextCount)) {
        setNotificationCount(Math.max(0, nextCount));
      }
    };

    window.addEventListener("notifications-count-changed", handler);
    return () =>
      window.removeEventListener("notifications-count-changed", handler);
  }, []);

  useEffect(() => {
    if (!usuario?._id) {
      toast.dismiss("pending-notifications-toast");
      toast.dismiss("no-pending-notifications-toast");
      setLastToastCount(0);
      return;
    }

    if (notificationCount <= 0) {
      toast.dismiss("pending-notifications-toast");
      if (lastToastCount > 0) {
        toast.success("Ya no tienes notificaciones pendientes.", {
          id: "no-pending-notifications-toast",
          duration: 3000,
        });
      }
      setLastToastCount(0);
      return;
    }

    if (notificationCount === lastToastCount) {
      return;
    }

    const mensaje =
      notificationCount === 1
        ? "Tienes 1 notificación pendiente de revisar."
        : `Tienes ${notificationCount} notificaciones pendientes de revisar.`;

    toast(mensaje, {
      id: "pending-notifications-toast",
      duration: 4000,
      icon: "🔔",
    });
    setLastToastCount(notificationCount);
  }, [notificationCount, lastToastCount, usuario?._id]);

  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto);
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const isActive = (path) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const notificationBadgeText =
    notificationCount > 9 ? "9+" : `${notificationCount}`;

  const handleOpenNotificaciones = () => {
    setMenuAbierto(false);
    if (isMobileView) {
      navigate("/notificaciones");
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <header className="navbar">
        <Link to="/">
          <img src={logo} className="logo" alt="Logo Komuness" />
        </Link>

        <button
          className="botonMovil"
          onClick={toggleMenu}
          aria-label={menuAbierto ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuAbierto}
        >
          {menuAbierto ? <AiOutlineClose /> : <AiOutlineMenu />}
        </button>

        <nav className={`nav-menu ${menuAbierto ? "menu-abierto" : ""}`}>
          <ul className="menu">
            <li
              onClick={() => handleNavigation("/")}
              className={isActive("/") ? "activo" : ""}
            >
              <span>Inicio</span>
            </li>
            <li
              onClick={() => handleNavigation("/publicaciones")}
              className={isActive("/publicaciones") ? "activo" : ""}
            >
              <span>Publicaciones</span>
            </li>
            <li
              onClick={() => handleNavigation("/eventos")}
              className={isActive("/eventos") ? "activo" : ""}
            >
              <span>Cartelera de Eventos</span>
            </li>
            <li
              onClick={() => handleNavigation("/emprendimientos")}
              className={isActive("/emprendimientos") ? "activo" : ""}
            >
              <span>Emprendimientos</span>
            </li>
            <li
              onClick={() => handleNavigation("/biblioteca/0")}
              className={isActive("/biblioteca") ? "activo" : ""}
            >
              <span>Biblioteca</span>
            </li>
           

            <li
              onClick={() => handleNavigation("/tutoriales")}
              className={isActive("/tutoriales") ? "activo" : ""}
            >
              <span>Tutoriales</span>
            </li>

            <li
              onClick={() => handleNavigation("/proyectos-destacados")}
              className={isActive("/proyectos-destacados") ? "activo" : ""}
            >
              <span>Proyectos Destacados</span>
            </li>

            <li
              onClick={() => handleNavigation("/profesionales")}
              className={isActive("/profesionales") ? "activo" : ""}
            >
              <FaUsers className="profesionales-icon" />
              <span className="menu-text-movil">Profesionales</span>
            </li>
            <li
              onClick={() =>
                handleNavigation(
                  goToLogin ? "/perfilUsuario" : "/iniciarSesion",
                )
              }
              className={
                isActive("/perfilUsuario") ||
                isActive("/iniciarSesion") ||
                isActive("/admin")
                  ? "activo"
                  : ""
              }
            >
              <AiOutlineUser className="user-icon" />
              <span className="menu-text-movil">
                {goToLogin ? "Mi Perfil" : "Iniciar Sesión"}
              </span>
            </li>
            <li
              onClick={handleOpenNotificaciones}
              className={isActive("/notificaciones") ? "activo" : ""}
            >
              <div className="notification-icon-wrapper">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
                  />
                </svg>
                {notificationCount > 0 && (
                  <span className="notification-badge">
                    {notificationBadgeText}
                  </span>
                )}
              </div>
              <span className="menu-text-movil">Notificaciones</span>
            </li>
          </ul>
        </nav>
      </header>

      {menuAbierto && (
        <div
          className="menu-overlay"
          onClick={() => setMenuAbierto(false)}
          aria-hidden="true"
        />
      )}
      <div>
        <Notificaciones
          open={open}
          setOpen={setOpen}
          onCountChange={setNotificationCount}
        />
      </div>
    </>
  );
};

export default Navbar;
