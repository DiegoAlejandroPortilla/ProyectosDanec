import React, { useState, useEffect } from "react";
import { database, ref, onValue } from "../firebaseConfig";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from "recharts";
import { FormControl, Select, MenuItem, InputLabel, Card, CardContent, Grid, TextField } from "@mui/material";
import { format, getISOWeek, parseISO } from "date-fns";

const GraficEfectividadVentas = () => {
  const [data, setData] = useState({});
  const [agenciaSeleccionada, setAgenciaSeleccionada] = useState("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState("efectividadMensual");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [liderSeleccionado, setLiderSeleccionado] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
  useEffect(() => {
    const dbRef = ref(database);
    onValue(dbRef, (snapshot) => {
        if (snapshot.exists()) {
            let firebaseData = snapshot.val();

            // Excluir la tabla "Data"
            const { Data, ...filteredData } = firebaseData;

            const efectividadPorAgencia = calcularEfectividadVentas(filteredData);
            setData(efectividadPorAgencia);

            if (efectividadPorAgencia["CUE"]) {
                setAgenciaSeleccionada("CUE");
            }
        }
    }, (error) => {
        console.error("❌ Error al obtener datos:", error);
    });
}, []);


  const calcularEfectividadVentas = (firebaseData) => {
    let efectividadPorAgencia = {};
  
    Object.keys(firebaseData).forEach((agencia) => {
      let registros = firebaseData[agencia];
      let efectividadVendedores = {};
  
      Object.values(registros).forEach((registro) => {
        // Verificar que los campos necesarios estén presentes
        if (!registro["Fecha"] || !registro["Vendedor "]) return;
  
        let efectividadVentasStr = registro["Efectividad de Ventas "];
  
        // Excluir registros con "S/P"
        if (efectividadVentasStr === "S/P") return;
  
        let efectividadVentas = 0;
  
        if (typeof efectividadVentasStr === "string") {
          // Si es un string, elimina el % y convierte a número decimal
          efectividadVentas = parseFloat(efectividadVentasStr.replace("%", "")) / 100 || 0;
        } else if (typeof efectividadVentasStr === "number") {
          efectividadVentas = efectividadVentasStr;
        }
  
        // Excluir registros con efectividad de ventas igual a 0
        if (efectividadVentas === 0) return;
  
        let fecha = new Date(registro["Fecha"]);
        let mes = format(fecha, "yyyy-MM");
        let semana = `${format(fecha, "yyyy")}-W${getISOWeek(fecha)}`;
        let vendedor = registro["Vendedor "].trim();
        let lider = registro["LIDER"] ? registro["LIDER"].trim() : "";
  
        if (!efectividadVendedores[vendedor]) {
          efectividadVendedores[vendedor] = {
            lider: lider,
            efectividadMensual: {},
            efectividadSemanal: {},
            conteoMensual: {}, // Contador de registros por mes
            conteoSemanal: {}  // Contador de registros por semana
          };
        }
  
        // Acumulación de la efectividad de ventas mensual
        if (!efectividadVendedores[vendedor].efectividadMensual[mes]) {
          efectividadVendedores[vendedor].efectividadMensual[mes] = 0;
          efectividadVendedores[vendedor].conteoMensual[mes] = 0;
        }
        efectividadVendedores[vendedor].efectividadMensual[mes] += efectividadVentas * 100;
        efectividadVendedores[vendedor].conteoMensual[mes] += 1;
  
        // Acumulación de la efectividad de ventas semanal
        if (!efectividadVendedores[vendedor].efectividadSemanal[semana]) {
          efectividadVendedores[vendedor].efectividadSemanal[semana] = 0;
          efectividadVendedores[vendedor].conteoSemanal[semana] = 0;
        }
        efectividadVendedores[vendedor].efectividadSemanal[semana] += efectividadVentas;
        efectividadVendedores[vendedor].conteoSemanal[semana] += 1;
      });
  
      // Calcular promedios
      Object.keys(efectividadVendedores).forEach((vendedor) => {
        // Promedio mensual
        Object.keys(efectividadVendedores[vendedor].efectividadMensual).forEach((mes) => {
          let suma = efectividadVendedores[vendedor].efectividadMensual[mes];
          let conteo = efectividadVendedores[vendedor].conteoMensual[mes];
          if (conteo > 0) {
            efectividadVendedores[vendedor].efectividadMensual[mes] = suma / conteo;
          } else {
            efectividadVendedores[vendedor].efectividadMensual[mes] = 0; // Evitar división por 0
          }
        });
  
        // Promedio semanal
        Object.keys(efectividadVendedores[vendedor].efectividadSemanal).forEach((semana) => {
          let suma = efectividadVendedores[vendedor].efectividadSemanal[semana];
          let conteo = efectividadVendedores[vendedor].conteoSemanal[semana];
          if (conteo > 0) {
            efectividadVendedores[vendedor].efectividadSemanal[semana] = (suma / conteo) * 100;
          } else {
            efectividadVendedores[vendedor].efectividadSemanal[semana] = 0; // Evitar división por 0
          }
        });
      });
  
      efectividadPorAgencia[agencia] = efectividadVendedores;
    });
  
    return efectividadPorAgencia;
  };
  

  const obtenerPeriodo = () => {
    if (!fechaSeleccionada || !(fechaSeleccionada instanceof Date)) {
      return "";
    }
    return tipoSeleccionado === "efectividadMensual"
      ? format(fechaSeleccionada, "yyyy-MM")
      : `${format(fechaSeleccionada, "yyyy")}-W${getISOWeek(fechaSeleccionada)}`;
  };

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

  const procesarDatos = () => {
    if (!data[agenciaSeleccionada]) {
      return { datos: [], lideres: [] };
    }
  
    const vendedores = data[agenciaSeleccionada];
    const periodo = obtenerPeriodo();
    let datosFinales = [];
  
    Object.entries(vendedores).forEach(([vendedor, info]) => {
      const lider = info.lider || "Sin Líder";
      const efectividadVentas = info[tipoSeleccionado]?.[periodo] || 0;
  
      // 🔹 Excluir valores "S/P" y efectividad de ventas menor o igual a 0
      if (efectividadVentas === "S/P" || efectividadVentas <= 0) return;
  
      // Filtrar vendedores según la categoría seleccionada
      const ocultarVendedor =
        (categoriaSeleccionada === "COB" && !vendedor.includes("VeCob")) ||
        (categoriaSeleccionada === "MAY" && !vendedor.includes("VeMay") && !vendedor.includes("EsMay")) ||
        (categoriaSeleccionada === "HOR" && !vendedor.includes("VeHor")) ||
        (categoriaSeleccionada === "PAN" && !vendedor.includes("VePan")) ||
        (categoriaSeleccionada === "IND" && !vendedor.includes("VeInd"));
  
      // Solo incluir vendedores que cumplen con los filtros de líder, categoría y efectividad válida
      if (!ocultarVendedor && (liderSeleccionado === "" || lider === liderSeleccionado)) {
        datosFinales.push({ vendedor, efectividadVentas });
      }
    });
  
    datosFinales.sort((a, b) => b.efectividadVentas - a.efectividadVentas); // Ordenar de mayor a menor
    return { datos: datosFinales, lideres: Object.values(vendedores).map((v) => v.lider) };
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

            <Bar dataKey="efectividadVentas" name="Efectividad de Ventas (%)">
              {procesarDatos().datos.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill="#00BFFF" // Color celeste
                />
              ))}
              <LabelList
                dataKey="efectividadVentas"
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

export default GraficEfectividadVentas;