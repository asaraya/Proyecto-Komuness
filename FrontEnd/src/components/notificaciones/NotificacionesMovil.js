import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AiOutlineClose } from "react-icons/ai";
import Notificaciones from "./notificaciones";

const MOBILE_BREAKPOINT = 768;

const NotificacionesMovil = () => {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(
    () => window.innerWidth <= MOBILE_BREAKPOINT
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      navigate("/publicaciones", { replace: true });
    }
  }, [isMobile, navigate]);

  return (
    <div className="min-h-[calc(100vh-120px)] px-2 py-3">
      <div className="w-full max-w-3xl mx-auto flex justify-end px-4">
        <button
          onClick={() => navigate(-1)}
          className="text-slate-100 bg-blue-900 border border-slate-600 rounded-md p-1"
          aria-label="Cerrar notificaciones"
          title="Cerrar notificaciones"
        >
          <AiOutlineClose className="w-5 h-5" />
        </button>
      </div>
      <Notificaciones standalone open />
    </div>
  );
};

export default NotificacionesMovil;
