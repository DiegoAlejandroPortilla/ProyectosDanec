import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { format, getISOWeek, parseISO } from "date-fns";
import "react-datepicker/dist/react-datepicker.css";
import { database, ref, push, onValue } from "./firebaseConfig";
import { LabelList, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { IconButton, Button, Card, CardContent, Typography, Grid, Select, MenuItem, InputLabel, FormControl, Box, TextField } from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import GraficaCompleteRuta from "./Graficas/GraficCompleteRuta";
import GraficVentaDiaria from "./Graficas/GraficVentaDiaria";
import GraficVentaDiariaLine from "./Graficas/GaficVentaDiariaLine";
import "./Grafics.css";
import { motion, AnimatePresence } from "framer-motion";
const ExcelUploader = () => {
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState({});
  const [firebaseData, setFirebaseData] = useState({});
  const [promediosCalculados, setPromediosCalculados] = useState({});
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [maximizedLeft, setMaximizedLeft] = useState(false); // Para la gráfica de la izquierda
  const [maximizedRight, setMaximizedRight] = useState(false); // Para la gráfica de la derecha
  const [maximizedVentas, setMaximizedVentas] = useState(false); // Nuevo estado para la gráfica de ventas
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    "Hora Fin/Ultimo Registro Visita"
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
        data[key] = parseFloat(data[key].toFixed(2)); // Redondear a dos decimales
      }
    }
    return data;
  };

  // 🔹 Función para limpiar y convertir valores correctamente
  const formatValue = (key, value) => {
    if (value === undefined || value === null) return value;

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
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    // Convertir duración (horas trabajadas) de decimal a HH:mm:ss
    if (durationColumns.includes(key) && !isNaN(value)) {
      let totalSeconds = Math.round(parseFloat(value) * 24 * 3600);
      let hours = Math.floor(totalSeconds / 3600);
      let minutes = Math.floor((totalSeconds % 3600) / 60);
      let seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    // 🔹 CORRECCIÓN: Redondear valores en dólares antes de formatear y mostrar
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
        let sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

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

    for (const sheetName in excelData) {
      for (const row of excelData[sheetName]) {
        try {
          await push(ref(database, sheetName), row);
        } catch (error) {
          console.error(`Error subiendo datos a la colección ${sheetName}:`, error);
        }
      }
    }

    alert("Datos subidos exitosamente a Firebase Realtime Database.");
    setExcelData({});
    setFile(null);
  };

  // Obtener datos desde Firebase y mostrarlos en la consola
  useEffect(() => {
    const dbRef = ref(database);
    onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        let data = snapshot.val();
        data = formatRetrievedData(data); // Aplicar formateo de decimales
        setFirebaseData(data);
        console.log("🔥 Datos obtenidos desde Firebase:", data);
      } else {
        //console.log("⚠️ No hay datos en Firebase.");
      }
    }, (error) => {
      console.error("❌ Error al obtener datos:", error);
    });
  }, []);

  // Función para calcular promedios por vendedor (con líder) y retornarlos
  const calcularPromediosPorVendedor = () => {
    if (!firebaseData || Object.keys(firebaseData).length === 0) {
      console.log("⚠️ No hay datos disponibles.");
      return {};
    }

    const datos = firebaseData;
    let promediosPorAgencia = {};

    Object.keys(datos).forEach((agencia) => {
      let registros = datos[agencia];
      let promediosVendedores = {};

      Object.values(registros).forEach((registro) => {
        if (!registro["Fecha"] || !registro["Porcentaje de Cumplimiento de Ruta"] || !registro["Vendedor "]) return;

        let fecha = new Date(registro["Fecha"]);
        let mes = fecha.getFullYear() + "-" + (fecha.getMonth() + 1).toString().padStart(2, "0"); // Formato YYYY-MM
        let semana = fecha.getFullYear() + "-" + getWeekNumber(fecha); // Formato YYYY-WXX
        let vendedor = registro["Ruta "].trim();
        let lider = registro["LIDER"] ? registro["LIDER"].trim() : "";
        let porcentaje = parseFloat(registro["Porcentaje de Cumplimiento de Ruta"].replace("%", "")) || 0;

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

      // Calcular promedios
      let resultados = {};
      Object.keys(promediosVendedores).forEach((vendedor) => {
        let promediosMensuales = {};
        let promediosSemanales = {};

        Object.keys(promediosVendedores[vendedor].sumasMensuales).forEach((mes) => {
          promediosMensuales[mes] = (
            promediosVendedores[vendedor].sumasMensuales[mes] /
            promediosVendedores[vendedor].conteosMensuales[mes]
          ).toFixed(2) + "%";
        });

        Object.keys(promediosVendedores[vendedor].sumasSemanales).forEach((semana) => {
          promediosSemanales[semana] = (
            promediosVendedores[vendedor].sumasSemanales[semana] /
            promediosVendedores[vendedor].conteosSemanales[semana]
          ).toFixed(2) + "%";
        });

        resultados[vendedor] = {
          lider: promediosVendedores[vendedor].lider,
          promedioMensual: promediosMensuales,
          promedioSemanal: promediosSemanales,
        };
      });

      promediosPorAgencia[agencia] = resultados;
    });

    //console.log("📊 Promedios por agencia y vendedor:", promediosPorAgencia);
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

    console.log("maximizedVentas:", maximizedVentas);
    console.log("isMobile:", isMobile);

    // Procesar datos para la gráfica: para cada vendedor se extrae el porcentaje del periodo predeterminado
    const procesarDatos = () => {
      if (!data[agenciaSeleccionada]) return { datos: [], lideres: [] };

      const vendedores = data[agenciaSeleccionada];
      const periodo = obtenerPeriodo();

      let datosFinales = [];

      Object.entries(vendedores).forEach(([vendedor, info]) => {
        const lider = info.lider || "Sin Líder";

        // Si hay un líder seleccionado, solo mostramos sus vendedores
        if (liderSeleccionado === "" || lider === liderSeleccionado) {
          datosFinales.push({
            vendedor,
            porcentaje: parseFloat(
              (tipoSeleccionado === "promedioMensual"
                ? info.promedioMensual[periodo]
                : info.promedioSemanal[periodo]
              )?.replace("%", "") || 0
            ),
          });
        }
      });

      return { datos: datosFinales };
    };

    return (
      <Card sx={{ mt: 3, p: 2, maxWidth: '100%' }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center" justifyContent="center" direction={{ xs: "column", sm: "row" }}>
            {/* Selector de Agencia */}
            <Grid item xs={12} sm={6} md={3}>
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

            {/* Selector de Líder */}
            <Grid item xs={12} sm={6} md={3}>
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
            <Grid item xs={12} sm={6} md={3}>
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
                    boxShadow: '0 0 5px rgba(63, 81, 181, 0.5)',
                  },
                },
              }}
            />
          </Grid>

          {/* Gráfica */}
          <ResponsiveContainer width="100%" height={isMobile ? 500 : 500}>
            <BarChart
              data={procesarDatos().datos}
              margin={{ top: 20, right: 30, left: 20, bottom: isMobile ? 100 : 80 }}
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
      {/* 🔹 Card para Subir Archivo */}
      <Card sx={{ p: 3, mb: 3 }}>
        <CardContent>
          <Typography variant="h5" align="center">Subir Archivo Excel a Firebase</Typography>
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
              <Button variant="contained" color="success" onClick={handleUploadToFirebase}>Subir</Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 🔹 Gráficas en paralelo */}
      {Object.keys(promediosCalculados).length > 0 && (
        <Grid container spacing={2} alignItems="stretch">
          {/* Primera gráfica */}
          <Grid
            item
            xs={12}
            sm={isMobile ? 12 : (maximizedLeft ? 12 : 6)}
            sx={{
              display: isMobile || !maximizedRight ? "block" : "none",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              style={{ height: "100%" }}
            >
              <Card sx={{ p: 3, height: "100%", position: "relative" }}>
                {!isMobile && (
                  <Box sx={{ position: "absolute", top: 10, right: 10 }}>
                    <IconButton
                      size="small"
                      sx={{ p: 0, m: 0, width: 24, height: 24 }}
                      onClick={() => {
                        setMaximizedLeft(!maximizedLeft);
                        setMaximizedRight(false);
                      }}
                    >
                      {maximizedLeft ? <Remove fontSize="small" /> : <Add fontSize="small" />}
                    </IconButton>
                  </Box>
                )}
                <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Typography variant="h6" align="center">Gráfica de Cumplimiento de Ruta</Typography>
                  <GraficaCumplimiento data={promediosCalculados} />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Segunda gráfica */}
          <Grid
            item
            xs={12}
            sm={isMobile ? 12 : (maximizedRight ? 12 : 6)}
            sx={{
              display: isMobile || !maximizedLeft ? "block" : "none",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              style={{ height: "100%" }}
            >
              <Card sx={{ p: 3, height: "100%", position: "relative" }}>
                {!isMobile && (
                  <Box sx={{ position: "absolute", top: 10, left: 10 }}>
                    <IconButton
                      size="small"
                      sx={{ p: 0, m: 0, width: 24, height: 24 }}
                      onClick={() => {
                        setMaximizedRight(!maximizedRight);
                        setMaximizedLeft(false);
                      }}
                    >
                      {maximizedRight ? <Remove fontSize="small" /> : <Add fontSize="small" />}
                    </IconButton>
                  </Box>
                )}
                <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Typography variant="h6" align="center">Gráfica de Cumplimiento de Ruta (Diario)</Typography>
                  <GraficaCompleteRuta />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        </Grid>
      )}

      {/* Gráfica de Ventas Diarias */}
        <Grid container spacing={2} alignItems="stretch" sx={{ mt: 2 }}>
          <Grid
            item
            xs={12}
            sm={isMobile ? 12 : (maximizedVentas ? 12 : 6)}
            sx={{
              display: isMobile || !maximizedVentas ? "block" : "none",
            }}
          >
            <AnimatePresence>
              <motion.div
                key="grafica-ventas"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                style={{ height: "100%" }}
              >
                <Card sx={{ p: 3, height: "100%", position: "relative" }}>
                  {!isMobile && (
                    <Box sx={{ position: "absolute", top: 10, right: 10 }}>
                      <IconButton
                        size="small"
                        sx={{ p: 0, m: 0, width: 24, height: 24 }}
                        onClick={() => {
                          setMaximizedVentas(!maximizedVentas);
                        }}
                      >
                        {maximizedVentas ? <Remove fontSize="small" /> : <Add fontSize="small" />}
                      </IconButton>
                    </Box>
                  )}
                  <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <Typography variant="h6" align="center">Gráfica de Avance de Ventas Totales</Typography>
                    <GraficVentaDiaria />
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </Grid>
        </Grid>
        {/* Segunda gráfica */}
        <Grid
            item
            xs={12}
            sm={isMobile ? 12 : (maximizedRight ? 12 : 6)}
            sx={{
              display: isMobile || !maximizedLeft ? "block" : "none",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              style={{ height: "100%" }}
            >
              <Card sx={{ p: 3, height: "100%", position: "relative" }}>
                {!isMobile && (
                  <Box sx={{ position: "absolute", top: 10, left: 10 }}>
                    <IconButton
                      size="small"
                      sx={{ p: 0, m: 0, width: 24, height: 24 }}
                      onClick={() => {
                        setMaximizedRight(!maximizedRight);
                        setMaximizedLeft(false);
                      }}
                    >
                      {maximizedRight ? <Remove fontSize="small" /> : <Add fontSize="small" />}
                    </IconButton>
                  </Box>
                )}
                <CardContent sx={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <Typography variant="h6" align="center">Gráfica de Ventas  (Diario)</Typography>
                  <GraficVentaDiariaLine />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
    </div>
  );

}

export default ExcelUploader;