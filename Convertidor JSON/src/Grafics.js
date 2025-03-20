import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
import { format, getISOWeek, parseISO } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { database, ref, push, onValue, get } from "./firebaseConfig";
import { LabelList, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { IconButton, Button, Card, CardContent, Typography, Grid, Select, MenuItem, InputLabel, FormControl, Box, TextField, CircularProgress, Modal } from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import GraficaCompleteRuta from "./Graficas/GraficCompleteRuta";
import GraficVentaDiaria from "./Graficas/GraficVentaDiaria";
import GraficVentaDiariaLine from "./Graficas/GaficVentaDiariaLine";
import GraficTicketPromedio from "./Graficas/GraficTicketPromedio";
import GraficTicketPromedioLine from "./Graficas/GraficTicketPromedioLine";
import GraficEfectividadVisitas from "./Graficas/EfectividadVisitas";
import GraficEfectividadVisitasLine from "./Graficas/EfectividadVisitasLine";
import GraficEfectividadVentas from "./Graficas/EfectividadVenta";
import GraficEfectividadVentasLine from "./Graficas/EfectividadVentasLine";
import "./Grafics.css";
import { motion, AnimatePresence } from "framer-motion";
import GraficHoraInicio from "./Graficas/HoraInicio";
import GraficHoraInicioLine from "./Graficas/HoraInicioLine";
import GraficaHoraFin from "./Graficas/HoraFin";
import GraficHoraFinLine from "./Graficas/HoraFinLine";
import GraficaHorasTrabajadas from "./Graficas/HorasTrabajadas";
import GraficHorasTrabajadasLine from "./Graficas/HorasTrabajadasLine";
import GraficClientesPlanificados from "./Graficas/ClientesPlanificados";
import GraficClientesPlanificadosLine from "./Graficas/ClientesPlanificadosLine";
import GraficTiempoPromedioVisitas from "./Graficas/TiempoPromedioVisitas";
import GraficTiempoPromedioVisitasLine from "./Graficas/TiempoPromedioVisitasLine";
import InsertChartIcon from "@mui/icons-material/InsertChart";
const ExcelUploader = () => {
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState({});
  const [firebaseData, setFirebaseData] = useState({});
  const [promediosCalculados, setPromediosCalculados] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [maximizedLeft, setMaximizedLeft] = useState(false); // Para la gráfica de la izquierda
  const [maximizedRight, setMaximizedRight] = useState(false); // Para la gráfica de la derecha
  const [maximizedVentas, setMaximizedVentas] = useState(false); // Nuevo estado para la gráfica de ventas
  const [maximizedVentasLine, setMaximizedVentasLine] = useState(false);
  const [maximizedTicket, setMaximizedTicket] = useState(false);
  const [maximizedTicketLine, setMaximizedTicketLine] = useState(false);
  const [maximizedVisitas, setMaximizedVisitas] = useState(false);
  const [maximizedVisitasLine, setMaximizedVisitasLine] = useState(false);
  const [maximizedEfeVentas, setMaximizedEfeVentas] = useState(false);
  const [maximizedEfeVentasLine, setMaximizedEfeVentasLine] = useState(false);
  const [maximizedHoraInicio, setMaximizedHoraInicio] = useState(false);
  const [maximizedHoraInicioLine, setMaximizedHoraInicioLine] = useState(false);
  const [maximizedHoraFin, setMaximizedHoraFin] = useState(false);
  const [maximizedHoraFinLine, setMaximizedHoraFinLine] = useState(false);
  const [maximizedHorasTrabajadas, setMaximizedHorasTrabajadas] = useState(false);
  const [maximizedHorasTrabajadasLine, setMaximizedHorasTrabajadasLine] = useState(false);
  const [maximizedClientesPlanificados, setMaximizedClientesPlanificados] = useState(false);
  const [maximizedClientesPlanificadosLine, setMaximizedClientesPlanificadosLine] = useState(false);
  const [maximizedTiempoPromedioVisitas, setMaximizedTiempoPromedioVisitas] = useState(false);
  const [maximizedTiempoPromedioVisitasLine, setMaximizedTiempoPromedioVisitasLine] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(""); // Estado para la categoría seleccionada
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  // Columnas que deben ser convertidas a porcentaje
  const percentageColumns = [
    "Porcentaje de Cumplimiento de Ruta al medio día",
    "Porcentaje de Cumplimiento de Ruta",
    "Efectividad de Ventas",
    "Efectividad de Visitas"
  ];

  // Columnas que deben ser convertidas a hora
  const timeColumns = [
    "Hora Incio/Primer Registro Visita",
    "Hora Fin/Ultimo Registro Visita",
    "Tiempo Promedio de Visitas"
  ];

  // Columnas que deben ser convertidas a duración (horas trabajadas)
  const durationColumns = ["HORAS TRABAJADAS"];

  // Columnas que deben ser convertidas a dólares
  const dollarColumns = [
    "Avance de Ventas Totales",
    "Ticket Promedio"
  ];

  // Columnas que deben ser convertidas a fecha
  const dateColumns = ["Fecha"];

  // 🔹 Función para limpiar nombres de claves inválidas en Firebase
  const sanitizeKey = (key) => {
    return key.replace(/[.#$/\[\]]/g, "_"); // Reemplaza caracteres inválidos por "_"
  };

  // Función para formatear valores específicos
  const formatRetrievedData = (data) => {
    for (const key in data) {
      if (typeof data[key] === "object") {
        formatRetrievedData(data[key]);
      } else if (typeof data[key] === "number") {
        data[key] = isNaN(data[key]) ? null : parseFloat(data[key].toFixed(2));
      } else if (data[key] === "NaN:NaN:NaN") {
        data[key] = null;
      }
    }
    return data;
  };
  

  const formatValue = (key, value) => {
    if (value === undefined || value === null || value === "") return null;
  
    // Si el valor es "S/P", conservarlo tal cual en Firebase
    if (value === "S/P") return "S/P";
  
    // Convertir porcentaje
    if (percentageColumns.includes(key) && typeof value === "string" && value.includes("%")) {
      return value;
    }
    if (percentageColumns.includes(key) && !isNaN(value)) {
      return `${(parseFloat(value) * 100).toFixed(2)}%`;
    }
  
    // Convertir hora desde formato decimal (Excel almacena las horas como fracción de día)
    if (timeColumns.includes(key) && !isNaN(value)) {
      let totalSeconds = Math.round(parseFloat(value) * 24 * 3600);
      let hours = Math.floor(totalSeconds / 3600);
      let minutes = Math.floor((totalSeconds % 3600) / 60);
      let seconds = totalSeconds % 60;
      
      if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null; // Evitar NaN
  
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
  
    // Convertir duración (horas trabajadas) de decimal a HH:mm:ss
    if (durationColumns.includes(key) && !isNaN(value)) {
      let totalSeconds = Math.round(parseFloat(value) * 24 * 3600);
      let hours = Math.floor(totalSeconds / 3600);
      let minutes = Math.floor((totalSeconds % 3600) / 60);
      let seconds = totalSeconds % 60;
  
      if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) return null; // Evitar NaN
  
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
  
    // Redondear valores en dólares antes de formatear y mostrar
    if (dollarColumns.includes(key)) {
      let cleanValue = typeof value === "string" ? value.replace("$", "").trim() : value;
      let roundedValue = parseFloat(cleanValue);
      if (!isNaN(roundedValue)) {
        return `${roundedValue.toFixed(2)}`;
      }
    }
  
    // Convertir fecha a formato YYYY-MM-DD
    if (dateColumns.includes(key) && !isNaN(value)) {
      let date = new Date((value - 25569) * 86400 * 1000); // Convierte número de Excel a fecha
      if (isNaN(date.getTime())) return null; // Evita fechas inválidas
      return date.toISOString().split("T")[0];
    }
  
    return value;
  };
  
  

  // 🔹 Función para manejar la selección del archivo
  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    const reader = new FileReader();
    reader.readAsBinaryString(selectedFile);

    reader.onload = (event) => {
      const binaryString = event.target.result;
      const workbook = XLSX.read(binaryString, { type: "binary" });

      let previewData = {};
      workbook.SheetNames.forEach(sheetName => {
        const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: "" });


        if (sheetData.length > 1) {
          const headers = sheetData[1]; // Usar la segunda fila como encabezados
          const formattedData = sheetData.slice(2).map(row => {
            let obj = {};
            headers.forEach((key, index) => {
              if (key) {
                let sanitizedKey = sanitizeKey(key); // Normaliza la clave
                obj[sanitizedKey] = formatValue(key, row[index]);
              }
            });
            return obj;
          });

          previewData[sanitizeKey(sheetName)] = formattedData; // Normalizar también los nombres de las hojas
        }
      });

      setExcelData(previewData);
    };
  };

  // 🔹 Función para subir los datos a Firebase
  const handleUploadToFirebase = async () => {
    if (!file) {
      alert("Por favor, selecciona un archivo Excel.");
      return;
    }
  
    setLoading(true);
  
    try {
      for (const sheetName in excelData) {
        const sheetRef = ref(database, sheetName);
  
        const snapshot = await get(sheetRef);
        const existingData = snapshot.exists() ? snapshot.val() : {};
        const existingSet = new Set(Object.values(existingData).map(JSON.stringify));
  
        // 🔹 Filtrar registros vacíos (todos los valores son null)
        const newData = excelData[sheetName].filter(row => {
          return !existingSet.has(JSON.stringify(row)) && Object.values(row).some(value => value !== null);
        });
  
        // 🔹 Subir solo datos válidos
        for (const row of newData) {
          await push(sheetRef, row);
        }
  
      }
  
      alert("Datos subidos exitosamente a Firebase.");
      setExcelData({});
      setFile(null);
      setOpen(false);
    } catch (error) {
      console.error("Error al subir datos:", error);
      alert("Ocurrió un error al subir los datos.");
    } finally {
      setLoading(false);
    }
  };
  
  

  // Obtener datos desde Firebase y mostrarlos en la consola
  useEffect(() => {
    const dbRef = ref(database);
    onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        let data = snapshot.val();
        data = formatRetrievedData(data); // Aplicar formateo de decimales
        setFirebaseData(data);
      } else {
        console.log("⚠️ No hay datos en Firebase.");
      }
    }, (error) => {
      console.error("❌ Error al obtener datos:", error);
    });
  }, []);

  // Función para calcular promedios por vendedor (con líder) y retornarlos
  const calcularPromediosPorVendedor = () => {
    if (!firebaseData || Object.keys(firebaseData).length === 0) {
        return {};
    }

    const datos = firebaseData;
    let promediosPorAgencia = {};

    Object.keys(datos).forEach((agencia) => {
        let registros = datos[agencia];
        let promediosVendedores = {};

        Object.values(registros).forEach((registro) => {
            if (!registro["Fecha"] || !registro["Cumplimiento de Ruta"] || !registro["Vendedor "]) return;

            let fecha = new Date(registro["Fecha"]);
            let mes = fecha.getFullYear() + "-" + (fecha.getMonth() + 1).toString().padStart(2, "0"); // Formato YYYY-MM
            let semana = fecha.getFullYear() + "-" + getWeekNumber(fecha); // Formato YYYY-WXX
            let vendedor = registro["Vendedor "].trim();
            let lider = registro["LIDER"] ? registro["LIDER"].trim() : "";

            // Manejo seguro del valor de "Cumplimiento de Ruta"
            let valor = registro["Cumplimiento de Ruta"];
            
            // 🛑 Si el valor es "S/P" o inválido, **ignorar completamente**
            if (valor === "S/P" || valor === undefined || valor === null || valor === "" || isNaN(valor)) return;

            let porcentaje = 0;
            if (typeof valor === "string" && valor.includes("%")) {
                porcentaje = parseFloat(valor.replace("%", "")); // Convertir "95%" a 95
            } else if (!isNaN(valor)) {
                porcentaje = parseFloat(valor) * 100; // Convertir 0.95 a 95
            }

            if (!promediosVendedores[vendedor]) {
                promediosVendedores[vendedor] = {
                    lider: lider,
                    sumasMensuales: {},
                    conteosMensuales: {},
                    sumasSemanales: {},
                    conteosSemanales: {}
                };
            }

            // Agrupar por mes
            if (!promediosVendedores[vendedor].sumasMensuales[mes]) {
                promediosVendedores[vendedor].sumasMensuales[mes] = 0;
                promediosVendedores[vendedor].conteosMensuales[mes] = 0;
            }
            promediosVendedores[vendedor].sumasMensuales[mes] += porcentaje;
            promediosVendedores[vendedor].conteosMensuales[mes]++;

            // Agrupar por semana
            if (!promediosVendedores[vendedor].sumasSemanales[semana]) {
                promediosVendedores[vendedor].sumasSemanales[semana] = 0;
                promediosVendedores[vendedor].conteosSemanales[semana] = 0;
            }
            promediosVendedores[vendedor].sumasSemanales[semana] += porcentaje;
            promediosVendedores[vendedor].conteosSemanales[semana]++;
        });

        // Calcular promedios excluyendo "S/P"
        let resultados = {};
        Object.keys(promediosVendedores).forEach((vendedor) => {
            let promediosMensuales = {};
            let promediosSemanales = {};

            Object.keys(promediosVendedores[vendedor].sumasMensuales).forEach((mes) => {
                if (promediosVendedores[vendedor].conteosMensuales[mes] > 0) {
                    promediosMensuales[mes] = (
                        promediosVendedores[vendedor].sumasMensuales[mes] /
                        promediosVendedores[vendedor].conteosMensuales[mes]
                    ).toFixed(2) + "%";
                } else {
                    promediosMensuales[mes] = "S/P"; // Si no hay valores válidos, devolver "S/P"
                }
            });

            Object.keys(promediosVendedores[vendedor].sumasSemanales).forEach((semana) => {
                if (promediosVendedores[vendedor].conteosSemanales[semana] > 0) {
                    promediosSemanales[semana] = (
                        promediosVendedores[vendedor].sumasSemanales[semana] /
                        promediosVendedores[vendedor].conteosSemanales[semana]
                    ).toFixed(2) + "%";
                } else {
                    promediosSemanales[semana] = "S/P"; // Si no hay valores válidos, devolver "S/P"
                }
            });

            resultados[vendedor] = {
                lider: promediosVendedores[vendedor].lider,
                promedioMensual: promediosMensuales,
                promedioSemanal: promediosSemanales,
            };
        });

        promediosPorAgencia[agencia] = resultados;
    });

    return promediosPorAgencia;
};

  // Función auxiliar para obtener el número de la semana del año
  const getWeekNumber = (date) => {
    let firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    let pastDays = Math.floor((date - firstDayOfYear) / (24 * 60 * 60 * 1000));
    return Math.ceil((pastDays + firstDayOfYear.getDay() + 1) / 7);
  };

  // Al detectar cambios en firebaseData, calculamos los promedios y guardamos el resultado
  useEffect(() => {
    if (Object.keys(firebaseData).length > 0) {
      const resultados = calcularPromediosPorVendedor();
      setPromediosCalculados(resultados);
    }
  }, [firebaseData]);

  // Componente de gráfica de barras interactiva
  const GraficaCumplimiento = ({ data }) => {
    const [agenciaSeleccionada, setAgenciaSeleccionada] = useState(Object.keys(data)[0]);
    const [tipoSeleccionado, setTipoSeleccionado] = useState("promedioMensual"); // "promedioMensual" o "promedioSemanal"
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
    const [liderSeleccionado, setLiderSeleccionado] = useState(""); // 🔹 Nuevo estado para el filt

    // Se puede ajustar para elegir un periodo específico (en este ejemplo se toma el primer periodo encontrado)
    const obtenerPeriodo = () => {
      if (!fechaSeleccionada || !(fechaSeleccionada instanceof Date)) {
        return ""; // Retorna un valor por defecto si la fecha no es válida
      }

      if (tipoSeleccionado === "promedioMensual") {
        return format(fechaSeleccionada, "yyyy-MM"); // Formato: 2025-01
      } else {
        return `${format(fechaSeleccionada, "yyyy")}-${getISOWeek(fechaSeleccionada)}`; // Formato: 2025-W05
      }
    };

    // Obtener los líderes de la agencia seleccionada
    const obtenerLideresDeAgencia = () => {
      if (!data[agenciaSeleccionada]) return [];
      const vendedores = data[agenciaSeleccionada];
      const lideresUnicos = new Set();

      Object.values(vendedores).forEach((info) => {
        if (info.lider) {
          lideresUnicos.add(info.lider);
        }
      });

      return Array.from(lideresUnicos);
    };



    // Procesar datos para la gráfica: para cada vendedor se extrae el porcentaje del periodo predeterminado
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(""); // Estado del filtro

    const procesarDatos = () => {
      if (!data[agenciaSeleccionada]) return { datos: [], lideres: [] };

      const vendedores = data[agenciaSeleccionada];
      const periodo = obtenerPeriodo();
      let datosFinales = [];

      Object.entries(vendedores).forEach(([vendedor, info]) => {
        const lider = info.lider || "Sin Líder";
        const porcentaje = parseFloat(
          (tipoSeleccionado === "promedioMensual"
            ? info.promedioMensual[periodo]
            : info.promedioSemanal[periodo]
          )?.replace("%", "") || 0
        );

        // 🔹 Filtrar por categoría seleccionada en el ComboBox
        const ocultarVendedor =
          (categoriaSeleccionada === "COB" && !vendedor.includes("VeCob")) ||
          (categoriaSeleccionada === "MAY" && !vendedor.includes("VeMay") && !vendedor.includes("EsMay")) ||
          (categoriaSeleccionada === "HOR" && !vendedor.includes("VeHor")) ||
          (categoriaSeleccionada === "PAN" && !vendedor.includes("VePan")) ||
          (categoriaSeleccionada === "IND" && !vendedor.includes("VeInd"));

        // Solo incluir vendedores que coincidan con el filtro de líder y categoría
        if (!ocultarVendedor && (liderSeleccionado === "" || lider === liderSeleccionado)) {
          datosFinales.push({ vendedor, porcentaje });
        }
      });

      datosFinales.sort((a, b) => b.porcentaje - a.porcentaje); // Ordenar de mayor a menor
      return { datos: datosFinales };
    };


    const graficas = useMemo(
      () => [
        { title: "Gráfica de Promedio de Cumplimiento de Ruta", component: <GraficaCumplimiento /> },
        { title: "Gráfica de Cumplimiento de Ruta (Diario)", component: <GraficaCompleteRuta /> },
        { title: "Gráfica de Promedio de Efectividad de Visitas (50m)", component: <GraficEfectividadVisitas /> },
        { title: "Gráfica de Efectividad de Visitas (Diario)", component: <GraficEfectividadVisitasLine /> },
        { title: "Gráfica de Promedio de Efectividad de Ventas", component: <GraficEfectividadVentas /> },
        { title: "Gráfica Efectividad de Ventas (Diario)", component: <GraficEfectividadVentasLine /> },
        { title: "Gráfica de Promedio en dólares de Avance de Venta Diaria", component: <GraficVentaDiaria /> },
        { title: "Gráfica de Ventas (Diario)", component: <GraficVentaDiariaLine /> },
        { title: "Gráfica de Ticket Promedio", component: <GraficTicketPromedio /> },
        { title: "Gráfica Ticket Promedio (Diario)", component: <GraficTicketPromedioLine /> },
        { title: "Gráfica de Promedio de Hora Inicio", component: <GraficHoraInicio /> },
        { title: "Gráfica Hora Inicio (Diario)", component: <GraficHoraInicioLine /> },
        { title: "Gráfica de Promedio de Hora Fin", component: <GraficaHoraFin /> },
        { title: "Gráfica de Hora de fin (Diario)", component: <GraficHoraFinLine /> },
        { title: "Gráfica de Promedio de Horas Trabajadas", component: <GraficaHorasTrabajadas /> },
        { title: "Gráfica de Horas Trabajadas (Diario)", component: <GraficHorasTrabajadasLine /> },
        { title: "Gráfica de Promedio de Tiempo de Visitas", component: <GraficTiempoPromedioVisitas /> },
        { title: "Gráfica de Tiempo de Visitas (Diario)", component: <GraficTiempoPromedioVisitasLine /> },
        { title: "Gráfica de Promedio de Clientes Planificados", component: <GraficClientesPlanificados /> },
        { title: "Clientes Planificados (Diario)", component: <GraficClientesPlanificadosLine /> }
      ],
      []
    );
    // Filtra solo las gráficas que coincidan con el texto ingresado
    const graficasFiltradas = graficas.filter(({ title }) =>
      title.toLowerCase().includes(filterText.toLowerCase())
    );


    return (
      <Card sx={{ mt: 3, p: 2, maxWidth: '100%' }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center" justifyContent="center" >
            {/* Selector de Agencia */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Agencia</InputLabel>
                <Select
                  value={agenciaSeleccionada}
                  onChange={(e) => {
                    setAgenciaSeleccionada(e.target.value); // Cambiar la agencia seleccionada
                    setLiderSeleccionado(""); // Reiniciar el líder seleccionado al cambiar la agencia
                  }}
                >
                  {Object.keys(data).map((agencia) => (
                    <MenuItem key={agencia} value={agencia}>{agencia}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Canal</InputLabel>
                <Select
                  value={categoriaSeleccionada}
                  onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="HOR">HOR</MenuItem>
                  <MenuItem value="COB">COB</MenuItem>
                  <MenuItem value="MAY">MAY</MenuItem>
                  <MenuItem value="PAN">PAN</MenuItem>
                  <MenuItem value="IND">IND</MenuItem>
                </Select>
              </FormControl>
            </Grid>


            {/* Selector de Líder */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Líder</InputLabel>
                <Select
                  value={liderSeleccionado}
                  onChange={(e) => setLiderSeleccionado(e.target.value)}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {obtenerLideresDeAgencia().map((lider) => (
                    <MenuItem key={lider} value={lider}>{lider}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Selector de Tipo (Mensual/Semanal) */}
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth>
                <InputLabel>Tipo</InputLabel>
                <Select
                  value={tipoSeleccionado}
                  onChange={(e) => setTipoSeleccionado(e.target.value)}
                >
                  <MenuItem value="promedioMensual">Mensual</MenuItem>
                  <MenuItem value="promedioSemanal">Semanal</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Selector de Fecha */}
            <TextField
              fullWidth
              type={tipoSeleccionado === "promedioMensual" ? "month" : "date"}
              label="Fecha"
              value={fechaSeleccionada ? format(fechaSeleccionada, tipoSeleccionado === "promedioMensual" ? "yyyy-MM" : "yyyy-MM-dd") : ""}
              onChange={(e) => {
                const fecha = e.target.value; // Obtén el valor del input
                const fechaObj = tipoSeleccionado === "promedioMensual"
                  ? parseISO(`${fecha}-01`) // Para meses, agrega el día 01
                  : parseISO(fecha); // Para fechas, convierte directamente
                setFechaSeleccionada(fechaObj); // Guarda el objeto Date
              }}
              InputLabelProps={{
                shrink: true,
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  backgroundColor: '#f9f9f9',
                  '&:hover': {
                    borderColor: '#3f51b5',
                  },
                  '&.Mui-focused': {
                    borderColor: '#3f51b5',
                    boxShadow: '0 0 5px rgba(0, 37, 248, 0.5)',
                  },
                },
              }}
            />
          </Grid>

          {/* Gráfica */}
          <ResponsiveContainer width="100%" height={isMobile ? 600 : 600}>
            <BarChart
              data={procesarDatos().datos}
              margin={{ top: 70, right: 10, left: 0, bottom: isMobile ? 100 : 80 }}
            >
              <XAxis
                dataKey="vendedor"
                angle={isMobile ? -90 : -90}
                textAnchor="end"
                height={isMobile ? 150 : 100}
                interval={0}
                tick={{ fontSize: isMobile ? 10 : 12 }}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(tick) => `${tick}%`}
                tick={{ fontSize: isMobile ? 12 : 14 }}
              />
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend
                wrapperStyle={{ fontSize: isMobile ? 12 : 14 }}
                payload={[
                  { value: "Mayor a 90%", type: "square", color: "#8BC34A" },
                  { value: "Entre 80% y 90%", type: "square", color: "#FFEB3B" },
                  { value: "Menor a 80%", type: "square", color: "#FF7043" },
                ]}
              />
              <Bar dataKey="porcentaje" name="Porcentaje de Cumplimiento">
                {procesarDatos().datos.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.porcentaje > 90 ? "#8BC34A" :
                        entry.porcentaje < 80 ? "#FF7043" :
                          "#FFEB3B"
                    }
                  />
                ))}
                <LabelList
                  dataKey="porcentaje"
                  position="center"
                  angle={-90}
                  formatter={(value) => `${value}%`}
                  style={{ fontSize: isMobile ? 10 : 12, fill: "black" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div style={{ padding: "20px" }}>
       {/* 🔹 Título con icono */}
      <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
        <InsertChartIcon sx={{ fontSize: 40, color: "#1976D2", mr: 1 }} />
        <Typography variant="h4" fontWeight="bold">
          Indicadores Vendedores
        </Typography>
      </Box>

      {/* 🔹 Botón para abrir el modal */}
      <Box display="flex" justifyContent="center" mb={3}>
        <Button variant="contained" onClick={() => setOpen(true)}>
          Subir Archivo
        </Button>
      </Box>

      {/* Modal para subir archivo */}
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" align="center">Subir Archivo Excel</Typography>
          <Grid container spacing={2} alignItems="center" justifyContent="center" sx={{ mt: 2 }}>
            <Grid item>
              <Button variant="contained" component="label">
                Elegir Archivo
                <input type="file" accept=".xlsx, .xls" hidden onChange={handleFileUpload} />
              </Button>
            </Grid>
            {file && (
              <Grid item>
                <Typography>{file.name}</Typography>
              </Grid>
            )}
            <Grid item>
              <Button
                variant="contained"
                color="success"
                onClick={handleUploadToFirebase}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : "Subir"}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>
   


      {/* 🔹 Campo de filtro */}
      <TextField
        fullWidth
        label="Filtrar gráficas"
        value={filterText}
        onChange={(e) => setFilterText(e.target.value)}
        sx={{ mb: 3 }}
      />

      {/* 🔹 Lista de gráficas con filtro */}
      <Grid container spacing={2} alignItems="stretch">
        {[
          {
            title: "Gráfica de Promedio de Cumplimiento de Ruta",
            component: <GraficaCumplimiento data={promediosCalculados} />,
            state: maximizedLeft,
            setState: setMaximizedLeft,
            oppositeState: maximizedRight, // Estado opuesto (gráfica derecha)
            setOppositeState: setMaximizedRight // Función para ocultar la gráfica derecha
          },
          {
            title: "Gráfica de Cumplimiento de Ruta (Diario)",
            component: <GraficaCompleteRuta />,
            state: maximizedRight,
            setState: setMaximizedRight,
            oppositeState: maximizedLeft, // Estado opuesto (gráfica izquierda)
            setOppositeState: setMaximizedLeft // Función para ocultar la gráfica izquierda
          },
          {
            title: "Gráfica de Promedio de Efectividad de Visitas (50m)",
            component: <GraficEfectividadVisitas />,
            state: maximizedVentas,
            setState: setMaximizedVentas,
            oppositeState: maximizedVentasLine, // Estado opuesto (gráfica de línea)
            setOppositeState: setMaximizedVentasLine // Función para ocultar la gráfica de línea
          },
          {
            title: "Gráfica de Efectividad de Visitas (Diario)",
            component: <GraficEfectividadVisitasLine />,
            state: maximizedVentasLine,
            setState: setMaximizedVentasLine,
            oppositeState: maximizedVentas, // Estado opuesto (gráfica de barras)
            setOppositeState: setMaximizedVentas // Función para ocultar la gráfica de barras
          },
          {
            title: "Gráfica de Promedio de Efectividad de Ventas",
            component: <GraficEfectividadVentas />,
            state: maximizedEfeVentas,
            setState: setMaximizedEfeVentas,
            oppositeState: maximizedEfeVentasLine, // Estado opuesto (gráfica de línea)
            setOppositeState: setMaximizedEfeVentasLine // Función para ocultar la gráfica de línea
          },
          {
            title: "Gráfica Efectividad de Ventas (Diario)",
            component: <GraficEfectividadVentasLine />,
            state: maximizedEfeVentasLine,
            setState: setMaximizedEfeVentasLine,
            oppositeState: maximizedEfeVentas, // Estado opuesto (gráfica de barras)
            setOppositeState: setMaximizedEfeVentas // Función para ocultar la gráfica de barras
          },
          {
            title: "Gráfica de Promedio en dólares de Avance de Venta Diaria",
            component: <GraficVentaDiaria />,
            state: maximizedTicket,
            setState: setMaximizedTicket,
            oppositeState: maximizedTicketLine, // Estado opuesto (gráfica de línea)
            setOppositeState: setMaximizedTicketLine // Función para ocultar la gráfica de línea
          },
          {
            title: "Gráfica de Ventas (Diario)",
            component: <GraficVentaDiariaLine />,
            state: maximizedTicketLine,
            setState: setMaximizedTicketLine,
            oppositeState: maximizedTicket, // Estado opuesto (gráfica de barras)
            setOppositeState: setMaximizedTicket // Función para ocultar la gráfica de barras
          },
          {
            title: "Gráfica de Ticket Promedio",
            component: <GraficTicketPromedio />,
            state: maximizedTicket,
            setState: setMaximizedTicket,
            oppositeState: maximizedTicketLine, // Estado opuesto (gráfica de línea)
            setOppositeState: setMaximizedTicketLine // Función para ocultar la gráfica de línea
          },
          {
            title: "Gráfica Ticket Promedio (Diario)",
            component: <GraficTicketPromedioLine />,
            state: maximizedTicketLine,
            setState: setMaximizedTicketLine,
            oppositeState: maximizedTicket, // Estado opuesto (gráfica de barras)
            setOppositeState: setMaximizedTicket // Función para ocultar la gráfica de barr
          },
          {
            title: "Gráfica de Promedio de Hora Inicio",
            component: <GraficHoraInicio />,
            state: maximizedHoraInicio,
            setState: setMaximizedHoraInicio,
            oppositeState: maximizedHoraInicioLine, // Estado opuesto (gráfica de línea)
            setOppositeState: setMaximizedHoraInicioLine // Función para ocultar la gráfica de línea
          },
          {
            title: "Gráfica Hora Inicio (Diario)",
            component: <GraficHoraInicioLine />,
            state: maximizedHoraInicioLine,
            setState: setMaximizedHoraInicioLine,
            oppositeState: maximizedHoraInicio, // Estado opuesto (gráfica de barras)
            setOppositeState: setMaximizedHoraInicio // Función para ocultar la gráfica de barras
          },
          {
            title: "Gráfica de Promedio de Hora Fin",
            component: <GraficaHoraFin />,
            state: maximizedHoraFin,
            setState: setMaximizedHoraFin,
            oppositeState: maximizedHoraFinLine, // Estado opuesto (gráfica de línea)
            setOppositeState: setMaximizedHoraFinLine // Función para ocultar la gráfica de línea
          },
          {
            title: "Gráfica de Hora de fin (Diario)",
            component: <GraficHoraFinLine />,
            state: maximizedHoraFinLine,
            setState: setMaximizedHoraFinLine,
            oppositeState: maximizedHoraFin, // Estado opuesto (gráfica de barras)
            setOppositeState: setMaximizedHoraFin // Función para ocultar la gráfica de barras
          },
          {
            title: "Gráfica de Promedio de Horas Trabajadas",
            component: <GraficaHorasTrabajadas />,
            state: maximizedHorasTrabajadas,
            setState: setMaximizedHorasTrabajadas,
            oppositeState: maximizedHorasTrabajadasLine, // Estado opuesto (gráfica de línea)
            setOppositeState: setMaximizedHorasTrabajadasLine // Función para ocultar la gráfica de línea
          },
          {
            title: "Gráfica de Horas Trabajadas (Diario)",
            component: <GraficHorasTrabajadasLine />,
            state: maximizedHorasTrabajadasLine,
            setState: setMaximizedHorasTrabajadasLine,
            oppositeState: maximizedHorasTrabajadas, // Estado opuesto (gráfica de barras)
            setOppositeState: setMaximizedHorasTrabajadas // Función para ocultar la gráfica de barras
          },
          {
            title: "Gráfica de Promedio de Tiempo de Visitas",
            component: <GraficTiempoPromedioVisitas />,
            state: maximizedTiempoPromedioVisitas,
            setState: setMaximizedTiempoPromedioVisitas,
            oppositeState: maximizedTiempoPromedioVisitasLine, // Estado opuesto (gráfica de línea)
            setOppositeState: setMaximizedTiempoPromedioVisitasLine // Función para ocultar la gráfica de línea 

          },
          {
            title: "Gráfica de Tiempo de Visitas (Diario)",
            component: <GraficTiempoPromedioVisitasLine />,
            state: maximizedTiempoPromedioVisitasLine,
            setState: setMaximizedTiempoPromedioVisitasLine,
            oppositeState: maximizedTiempoPromedioVisitas, // Estado opuesto (gráfica de barras)
            setOppositeState: setMaximizedTiempoPromedioVisitas // Función para ocultar la gráfica de barras
          },
          {
            title: "Gráfica de Promedio de Clientes Planificados",
            component: <GraficClientesPlanificados />,
            state: maximizedClientesPlanificados,
            setState: setMaximizedClientesPlanificados,
            oppositeState: maximizedClientesPlanificadosLine, // Estado opuesto (gráfica de línea)
            setOppositeState: setMaximizedClientesPlanificadosLine // Función para ocultar la gráfica de línea
          },
          {
            title: "Clientes Planificados (Diario)",
            component: <GraficClientesPlanificadosLine />,
            state: maximizedClientesPlanificadosLine,
            setState: setMaximizedClientesPlanificadosLine,
            oppositeState: maximizedClientesPlanificados, // Estado opuesto (gráfica de barras)
            setOppositeState: setMaximizedClientesPlanificados // Función para ocultar la gráfica de barras
          },


        ]
          .filter(({ title }) => title.toLowerCase().includes(filterText.toLowerCase())) // Filtrado dinámico
          .map(({ title, component, state, setState, oppositeState, setOppositeState }, index) => (
            <Grid
              key={title}
              item
              xs={12}  // Ocupa 12 columnas (toda la pantalla) en dispositivos pequeños
              sm={12}  // Mantiene una sola columna en pantallas medianas
              md={6}   // Dos columnas en pantallas grandes
            >
              <Card sx={{ p: 3, height: "100%", position: "relative" }}>
                {!isMobile && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: 10,
                      right: index % 2 === 0 ? 10 : "auto", // Derecha para la izquierda
                      left: index % 2 !== 0 ? 10 : "auto", // Izquierda para la derecha
                    }}
                  >
                    <IconButton
                      size="small"
                      sx={{ p: 0, m: 0, width: 24, height: 24 }}
                      onClick={() => {
                        if (state) {
                          // Si la gráfica está maximizada, la minimizamos
                          setState(false);
                          setOppositeState(false); // Restauramos la gráfica opuesta
                        } else {
                          // Si la gráfica está minimizada, la maximizamos
                          setState(true);
                          setOppositeState(false); // Ocultamos la gráfica opuesta
                        }
                      }}
                    >
                      {state ? <Remove fontSize="small" /> : <Add fontSize="small" />}
                    </IconButton>
                  </Box>
                )}
                <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Typography variant="h6" align="center">{title}</Typography>
                  {component}
                </CardContent>
              </Card>
            </Grid>
          ))}

      </Grid>
    </div>
  

  );
};


export default ExcelUploader;