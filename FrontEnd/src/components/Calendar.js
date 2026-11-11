// src/components/Calendar.js
import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { IoMdArrowRoundBack } from "react-icons/io";
import '../CSS/calendar.css';
import EventoDetalleModal from './EventoDetalleModal';
import { API_URL } from '../utils/api';

moment.locale('es');

const localizer = momentLocalizer(moment);

// Función para generar colores consistentes basados en la categoría
const generateCategoryColor = (category) => {
  if (!category) return '#757575';
  
  // Paleta de colores predefinidos
  const colorPalette = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', 
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2',
    '#F9E79F', '#A9DFBF', '#D2B4DE', '#AED6F1', '#F5CBA7',
    '#ABEBC6', '#E8DAEF', '#A3E4D7', '#FAD7A0', '#D5DBDB'
  ];
  
  // Generar un índice único basado en el string de la categoría
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colorPalette.length;
  return colorPalette[index];
};

// Mapa para cachear colores
const categoryColorCache = new Map();

const getCategoryColor = (category) => {
  if (!category) return '#757575';
  
  if (categoryColorCache.has(category)) {
    return categoryColorCache.get(category);
  }
  
  const color = generateCategoryColor(category);
  categoryColorCache.set(category, color);
  return color;
};

// Función para extraer el nombre de la categoría (maneja tanto strings como objetos)
const getCategoryName = (categoria) => {
  if (!categoria) return 'Sin categoría';
  
  if (typeof categoria === 'string') {
    return categoria;
  }
  
  if (typeof categoria === 'object' && categoria !== null) {
    return categoria.nombre || categoria._id || 'Sin categoría';
  }
  
  return 'Sin categoría';
};

export const CalendarView = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('month');
  const [categoryLegend, setCategoryLegend] = useState([]);
  const [selectedEvento, setSelectedEvento] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);

  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });

  useEffect(() => {
    fetchEvents(currentDate); 
  }, [currentDate]);

  const fetchEvents = async (date) => {
    try {
      setLoading(true);
      const dateMoment = moment(date);
      const startOfMonth = dateMoment.startOf('month').format('YYYY-MM-DD');
      const endOfMonth = dateMoment.endOf('month').format('YYYY-MM-DD');

      const response = await fetch(
        `${API_URL}/publicaciones/eventos/calendario?startDate=${startOfMonth}&endDate=${endOfMonth}`
      );
      if (!response.ok) throw new Error('Error al cargar eventos');

      const eventos = await response.json();
      
      // Procesar eventos y asignar colores
      const calendarEvents = eventos.map(evento => {
        const [year, month, day] = evento.fechaEvento.split('-');
        const [hours, minutes] = evento.horaEvento.split(':');
        const startDateTime = new Date(year, month - 1, day, hours, minutes);
        
        const categoriaNombre = getCategoryName(evento.categoria);
        const eventColor = getCategoryColor(categoriaNombre);
        
        return { 
          id: evento._id, 
          title: evento.titulo, 
          start: startDateTime, 
          end: startDateTime, 
          allDay: false, 
          resource: evento,
          categoria: categoriaNombre,
          style: {
            backgroundColor: eventColor,
            borderColor: eventColor,
            color: '#12143d',
            borderRadius: '4px',
            opacity: 0.9,
            fontWeight: 'bold'
          }
        };
      });
      
      setEvents(calendarEvents);
      
      // Generar leyenda de categorías
      const uniqueCategories = [...new Set(eventos.map(evento => getCategoryName(evento.categoria)))];
      const legend = uniqueCategories.map(categoria => ({
        categoria,
        color: getCategoryColor(categoria)
      }));
      setCategoryLegend(legend);
      
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvent = (event) => {
    setSelectedEvento(event.resource);
    setModalAbierto(true);
  };

  const handleCerrarModal = () => {
    setModalAbierto(false);
    setSelectedEvento(null);
  };
  
  const handleNavigate = (newDate) => { 
    setCurrentDate(newDate); 
  };

  const getTodayDate = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  };

  // Componente personalizado para eventos 
  const EventComponent = ({ event }) => {
    return (
      <div className="custom-event" title={event.title}>
        <strong>{event.title}</strong>
        {event.categoria && event.categoria !== 'Sin categoría' && (
          <div className="event-category-badge">
            {event.categoria}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="calendario-container calendario-loading">
        <div className="calendario-spinner"></div>
      </div>
    );
  }

  return (
    <div className="calendario-container p-4 md:p-6 mx-2 md:mx-4 my-4 relative">
      <div className="text-center mb-4 md:mb-6">
        <h2 className="calendario-titulo text-xl md:text-2xl font-bold">Calendario de Eventos</h2>
        <p className="calendario-mes text-lg md:text-xl mt-2">
          {moment(currentDate).format('MMMM YYYY').replace(/^\w/, c => c.toUpperCase())}
        </p>
      </div>

      {/* Leyenda de categorías */}
      {categoryLegend.length > 0 && (
        <div className="category-legend mb-4 p-3">
          <h3 className="text-sm font-semibold mb-2">Leyenda de Categorías:</h3>
          <div className="flex flex-wrap gap-2">
            {categoryLegend.map((item, index) => (
              <div key={index} className="flex items-center gap-1 text-xs">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span>{item.categoria}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="h-[400px] md:h-[600px]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={handleSelectEvent}
          onNavigate={handleNavigate}
          onView={setView}
          view={view}
          date={currentDate}
          today={getTodayDate()}
          views={['month', 'agenda']}
          style={{ height: '100%' }}
          // En Agenda la biblioteca pinta toda la fila con este estilo; ahí se
          // deja el fondo del tema y la categoría se ve en su etiqueta.
          eventPropGetter={(event) => (view === 'agenda' ? {} : { style: event.style })}
          components={{
            event: EventComponent
          }}
          messages={{
            next: "Siguiente", 
            previous: "Anterior", 
            today: "Hoy",
            month: "Mes", 
            week: "Semana", 
            day: "Día", 
            agenda: "Agenda",
            date: "Fecha", 
            time: "Hora", 
            event: "Evento",
            noEventsInRange: "No hay eventos en este rango de fechas",
            showMore: total => `+ Ver más (${total})`
          }}
        />
      </div>

      <EventoDetalleModal
        evento={selectedEvento}
        isOpen={modalAbierto}
        onClose={handleCerrarModal}
      />
    </div>
  );
};

export default CalendarView;
