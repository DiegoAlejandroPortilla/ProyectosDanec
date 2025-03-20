import React, { useState, useEffect } from "react";
import { database, ref, onValue } from "../firebaseConfig";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from "recharts";
import { FormControl, Select, MenuItem, InputLabel, Card, FormControlLabel, FormGroup, CardContent, Grid, TextField, Checkbox } from "@mui/material";
import { format, getISOWeek, parseISO } from "date-fns";
import { da } from "date-fns/locale";

const GraficEfectividadVisitas = () => {
  const [data, setData] = useState({});
  const [agenciaSeleccionada, setAgenciaSeleccionada] = useState("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState("efectividadMensual");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [liderSeleccionado, setLiderSeleccionado] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [filterCob, setFilterCob] = useState(true);
  const [filterMay, setFilterMay] = useState(true);
  const [filterHorPan, setFilterHorPan] = useState(true);
  const [filterInd, setFilterInd] = useState(true);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("Efectividad de Visitas");
  useEffect(() => {
    const dbRef = ref(database);
    onValue(dbRef, (snapshot) => {
        if (snapshot.exists()) {
            let firebaseData = snapshot.val();

            // Excluir la tabla "Data"
            const { Data, ...filteredData } = firebaseData;

            const efectividadPorAgencia = calcularEfectividadVisitas(filteredData);
            setData(efectividadPorAgencia);

            if (efectividadPorAgencia["CUE"]) {
                setAgenciaSeleccionada("CUE");
            }
        }
    }, (error) => {
        console.error("❌ Error al obtener datos:", error);
    });
}, []);



  const calcularEfectividadVisitas = (firebaseData) => {
    let efectividadPorAgencia = {};

    Object.keys(firebaseData).forEach((agencia) => {
      let vendedoresData = {};

      Object.values(firebaseData[agencia] || {}).forEach((registro) => {
        if (!registro["Fecha"] || !registro["Vendedor "] || registro["Efectividad de Visitas (50 m)"] === "S/P") {
          return;
        }

        const vendedor = registro["Vendedor "].trim();
        const lider = registro["LIDER"] || "Sin Líder"; // Asume que el campo se llama "Líder"
        const fecha = new Date(registro["Fecha"]);
        if (isNaN(fecha.getTime())) return;

        const mes = fecha.getFullYear() + "-" + (fecha.getMonth() + 1);
        const semana = `${fecha.getFullYear()}-W${getISOWeek(fecha)}`;

        let efectividadVisitas = parseFloat(registro["Efectividad de Visitas (50 m)"]);
        if (isNaN(efectividadVisitas)) return;

        if (efectividadVisitas > 0 && efectividadVisitas <= 1) {
          efectividadVisitas *= 100;
        }

        if (!vendedoresData[vendedor]) {
          vendedoresData[vendedor] = { lider, semanal: {}, mensual: {} }; // Incluye el líder aquí
        }

        // Agrupar por Semana
        if (!vendedoresData[vendedor].semanal[semana]) {
          vendedoresData[vendedor].semanal[semana] = { suma: 0, conteo: 0 };
        }
        vendedoresData[vendedor].semanal[semana].suma += efectividadVisitas;
        vendedoresData[vendedor].semanal[semana].conteo++;

        // Agrupar por Mes
        if (!vendedoresData[vendedor].mensual[mes]) {
          vendedoresData[vendedor].mensual[mes] = { suma: 0, conteo: 0 };
        }
        vendedoresData[vendedor].mensual[mes].suma += efectividadVisitas;
        vendedoresData[vendedor].mensual[mes].conteo++;
      });

      let efectividadMensual = [];
      let efectividadSemanal = [];

      Object.keys(vendedoresData).forEach((vendedor) => {
        const lider = vendedoresData[vendedor].lider; // Obtén el líder

        Object.keys(vendedoresData[vendedor].mensual).forEach((mes) => {
          const { suma, conteo } = vendedoresData[vendedor].mensual[mes];
          const promedio = conteo > 0 ? parseFloat((suma / conteo).toFixed(2)) : 0;
          efectividadMensual.push({ vendedor, efectividad: promedio, periodo: `Mes ${mes}`, lider }); // Incluye el líder
        });

        Object.keys(vendedoresData[vendedor].semanal).forEach((semana) => {
          const { suma, conteo } = vendedoresData[vendedor].semanal[semana];
          const promedio = conteo > 0 ? parseFloat((suma / conteo).toFixed(2)) : 0;
          efectividadSemanal.push({ vendedor, efectividad: promedio, periodo: `Semana ${semana}`, lider }); // Incluye el líder
        });
      });

      efectividadPorAgencia[agencia] = { efectividadMensual, efectividadSemanal };
    });

    return efectividadPorAgencia;
  };



  const obtenerPeriodo = () => {
    if (!fechaSeleccionada || !(fechaSeleccionada instanceof Date)) {
      return "";
    }
  
    const mes = fechaSeleccionada.getMonth() + 1; // getMonth() devuelve 0-11
    const periodo = tipoSeleccionado === "efectividadMensual"
      ? `Mes ${fechaSeleccionada.getFullYear()}-${mes}` // Formato: "Mes 2025-3"
      : `Semana ${format(fechaSeleccionada, "yyyy")}-W${getISOWeek(fechaSeleccionada)}`; // Formato: "Semana 2025-W12"
  
    return periodo;
  };

  const obtenerLideresDeAgencia = () => {
    if (!data[agenciaSeleccionada]) return [];
    const vendedores = data[agenciaSeleccionada].efectividadMensual; // Usa efectividadMensual o efectividadSemanal
    const lideresUnicos = new Set();

    vendedores.forEach((item) => {
      if (item.lider) {
        lideresUnicos.add(item.lider);
      }
    });

    return Array.from(lideresUnicos);
  };
  const procesarDatos = () => {
    if (!data[agenciaSeleccionada]) {
      return { datos: [], lideres: [] };
    }
  
    const periodo = obtenerPeriodo();
    let datosFinales = [];
  
    // Obtener los datos mensuales o semanales según el tipo seleccionado
    const datosEfectividad = data[agenciaSeleccionada][tipoSeleccionado];
  
    // Filtrar los datos por el periodo seleccionado
    const datosFiltradosPorPeriodo = datosEfectividad.filter(
      (item) => item.periodo === periodo
    );
  
  
    // Filtrar por categoría seleccionada y líder
    datosFiltradosPorPeriodo.forEach((item) => {
      const vendedor = item.vendedor;
      const efectividadVisitas = item.efectividad;
      const lider = item.lider; // Obtén el líder
  
      const ocultarVendedor =
        (categoriaSeleccionada === "COB" && !vendedor.includes("VeCob")) ||
        (categoriaSeleccionada === "MAY" && !vendedor.includes("VeMay") && !vendedor.includes("EsMay")) ||
        (categoriaSeleccionada === "HOR" && !vendedor.includes("VeHor")) ||
        (categoriaSeleccionada === "PAN" && !vendedor.includes("VePan")) ||
        (categoriaSeleccionada === "IND" && !vendedor.includes("VeInd"));
  
      // Aplicar filtro de líder
      const filtrarPorLider = liderSeleccionado === "" || lider === liderSeleccionado;
  
      if (!ocultarVendedor && filtrarPorLider) {
        datosFinales.push({ vendedor, efectividadVisitas, lider }); // Incluye el líder
      }
    });
  
    datosFinales.sort((a, b) => b.efectividadVisitas - a.efectividadVisitas);
  
    return { datos: datosFinales, lideres: obtenerLideresDeAgencia() }; // Devuelve los líderes
  };


  return (
    <Card sx={{ mt: 3, p: 2, maxWidth: "100%" }}>
      <CardContent>
        {/* Fila para Agencia, Líder y Tipo */}
        <Grid container spacing={2} alignItems="center" justifyContent="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel>Agencia</InputLabel>
              <Select
                value={agenciaSeleccionada}
                onChange={(e) => {
                  setAgenciaSeleccionada(e.target.value);
                  setLiderSeleccionado("");
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

          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={tipoSeleccionado}
                onChange={(e) => setTipoSeleccionado(e.target.value)}
              >
                <MenuItem value="efectividadMensual">Mensual</MenuItem>
                <MenuItem value="efectividadSemanal">Semanal</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Fila para la Fecha */}
        <TextField
          fullWidth
          type={tipoSeleccionado === "efectividadMensual" ? "month" : "date"}
          label="Fecha"
          value={fechaSeleccionada ? format(fechaSeleccionada, tipoSeleccionado === "efectividadMensual" ? "yyyy-MM" : "yyyy-MM-dd") : ""}
          onChange={(e) => {
            const fecha = e.target.value;
            const fechaObj = tipoSeleccionado === "efectividadMensual"
              ? parseISO(`${fecha}-01`)
              : parseISO(fecha);
            setFechaSeleccionada(fechaObj);
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

        {/* Checkboxes centrados 
        <Grid container justifyContent="center" sx={{ mt: 2 }}>
          <FormGroup row>
            <FormControlLabel
              control={<Checkbox checked={filterCob} onChange={(e) => setFilterCob(e.target.checked)} />}
              label="COB"
            />
            <FormControlLabel
              control={<Checkbox checked={filterMay} onChange={(e) => setFilterMay(e.target.checked)} />}
              label="MAY"
            />
            <FormControlLabel
              control={<Checkbox checked={filterHorPan} onChange={(e) => setFilterHorPan(e.target.checked)} />}
              label="HOR-PAN"
            />
            <FormControlLabel
              control={<Checkbox checked={filterInd} onChange={(e) => setFilterInd(e.target.checked)} />}
              label="IND"
            />
          </FormGroup>
        </Grid>
*/}
        {/* Gráfico de barras */}
        <ResponsiveContainer width="100%" height={600}>
          <BarChart data={procesarDatos().datos} margin={{ top: 50, bottom: 20 }}>
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
              tickFormatter={(tick) => `${tick.toLocaleString()}%`}
              domain={[0, 100]}
              tick={{ fontSize: isMobile ? 8 : 10 }}
            />
            <Tooltip formatter={(value) => `${value.toLocaleString()}%`} />
            <Bar dataKey="efectividadVisitas" name="Efectividad de Visitas (%)">
              {procesarDatos().datos.map((entry, index) => (
                <Cell key={`cell-${index}`} fill="#00BFFF" />
              ))}
              <LabelList
                dataKey="efectividadVisitas"
                position="center"
                angle={-90}
                formatter={(value) => `${value.toFixed(2)}%`}
                style={{ fontSize: isMobile ? 10 : 12, fill: "black" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default GraficEfectividadVisitas;