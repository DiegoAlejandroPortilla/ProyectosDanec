import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const TELEGRAM_BOT_TOKEN = "7773460660:AAHrjw-MfQgN7_ptk8yx56S1Fo--UuKTxqA"; // Tu nuevo Token
const TELEGRAM_CHAT_ID = "5642456903"; // Tu Chat ID

const sendMessageToTelegram = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const data = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
  };

  try {
    await axios.post(url, data);
    return { success: true, message: "Mensaje enviado con éxito" };
  } catch (error) {
    console.error("Error al enviar el mensaje:", error);
    return { success: false, message: "Error al enviar el mensaje" };
  }
};

const BotCartera = () => {
  const [history, setHistory] = useState([]);
  const [messageScheduled, setMessageScheduled] = useState(false); // Bandera para evitar programación repetida
  const timeoutRef = useRef(null); // Referencia para el timeout
  const [scheduledTime, setScheduledTime] = useState(null); // Para almacenar el tiempo programado

  // Función para programar el envío del mensaje a las 8:15 AM
  const scheduleMessage = () => {
    // Si ya está programado, no hacer nada
    if (messageScheduled) return;

    const now = new Date();
    const nextTargetTime = new Date();
    
    // Establecer la hora a las 8:32 AM
    nextTargetTime.setHours(8, 52, 0, 0); 

    const delay = nextTargetTime.getTime() - now.getTime(); // Calcula el tiempo restante hasta las 8:32 AM

    if (delay <= 0) {
      // Si ya pasó la hora de hoy, programa para el día siguiente
      nextTargetTime.setDate(nextTargetTime.getDate() + 1);
    }

    // Establecer el tiempo para enviar el mensaje
    setScheduledTime(nextTargetTime);

    // Configura el envío a las 8:32 AM
    timeoutRef.current = setTimeout(() => {
      sendMessageToTelegram("¡Es la hora! Este es tu mensaje programado.")
        .then((result) => {
          const newHistory = [
            ...history,
            { time: new Date().toLocaleString(), status: result.success ? "Exitoso" : "Fallido", message: result.message },
          ];
          setHistory(newHistory);
        })
        .catch(() => {
          const newHistory = [
            ...history,
            { time: new Date().toLocaleString(), status: "Fallido", message: "Error al enviar el mensaje" },
          ];
          setHistory(newHistory);
        });

      setMessageScheduled(false); // Después de enviar, asegúrate de marcar que no está programado
    }, delay); // Solo se ejecutará una vez en el tiempo calculado

    setMessageScheduled(true); // Marca que ya se programó un mensaje
  };

  // Función para cancelar el mensaje programado
  const cancelScheduledMessage = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current); // Cancela el timeout programado
      setMessageScheduled(false); // Desmarca el mensaje como programado
      console.log("El mensaje programado ha sido cancelado.");
    }
  };

  return (
    <div className="BotCartera">
      <h1>Historial de Mensajes a Telegram</h1>
      <button onClick={scheduleMessage}>Programar Mensaje a las 8:32 AM</button>
      <button onClick={cancelScheduledMessage}>Cancelar Mensaje Programado</button>

      <h2>Historial de Envíos:</h2>
      <ul>
        {history.map((entry, index) => (
          <li key={index}>
            <strong>{entry.time}</strong>: {entry.message} - Estado: {entry.status}
          </li>
        ))}
      </ul>

      {scheduledTime && (
        <div>
          <p>Mensaje programado para: {scheduledTime.toLocaleString()}</p>
        </div>
      )}
    </div>
  );
};

export default BotCartera;
