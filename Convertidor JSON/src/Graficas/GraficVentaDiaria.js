import React, { useState, useEffect } from "react";
import { database, ref, onValue } from "../firebaseConfig";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from "recharts";
import { FormControl, Select, MenuItem, InputLabel, Card, FormControlLabel, FormGroup, CardContent, Grid, TextField, Checkbox } from "@mui/material";
import { format, getISOWeek, parseISO } from "date-fns";

const GraficVentaDiaria = () => {
  const [data, setData] = useState({});
  const [agenciaSeleccionada, setAgenciaSeleccionada] = useState("");
  const [tipoSeleccionado, setTipoSeleccionado] = useState("totalMensual");
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [liderSeleccionado, setLiderSeleccionado] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [filterCob, setFilterCob] = useState(true);
  const [filterMay, setFilterMay] = useState(true);
  const [filterHorPan, setFilterHorPan] = useState(true);
  const [filterInd, setFilterInd] = useState(true);

  useEffect(() => {
    const dbRef = ref(database);
    onValue(dbRef, (snapshot) => {
      if (snapshot.exists()) {
        let firebaseData = snapshot.val();
        const ventasPorAgencia = calcularVentasTotales(firebaseData);
        setData(ventasPorAgencia);

        if (ventasPorAgencia["CUE"]) {
          setAgenciaSeleccionada("CUE");
        }
      }
    }, (error) => {
      console.error("❌ Error al obtener datos:", error);
    });
  }, []);

  const calcularPromedios = (ventasVendedores) => {
    Object.keys(ventasVendedores).forEach((vendedor) => {
      const info = ventasVendedores[vendedor];

      // Calcular promedio mensual
      Object.keys(info.totalMensual).forEach((mes) => {
        const totalMensual = info.totalMensual[mes];
        const diasEnMes = new Date(mes.split('-')[0], mes.split('-')[1], 0).getDate();
        info.totalMensual[mes] = totalMensual / diasEnMes;
      });

      // Calcular promedio semanal
      Object.keys(info.totalSemanal).forEach((semana) => {
        const totalSemanal = info.totalSemanal[semana];
        info.totalSemanal[semana] = totalSemanal / 7; // Asumiendo que la semana tiene 7 días
      });
    });
  };

  const calcularVentasTotales = (firebaseData) => {
    let ventasPorAgencia = {};
    Object.keys(firebaseData).forEach((agencia) => {
      let registros = firebaseData[agencia];
      let ventasVendedores = {};

      Object.values(registros).forEach((registro) => {
        if (!registro["Fecha"] || !registro["Avance de Ventas Totales "] || !registro["Vendedor "]) return;
        let fecha = new Date(registro["Fecha"]);
        let mes = format(fecha, "yyyy-MM");
        let semana = `${format(fecha, "yyyy")}-W${getISOWeek(fecha)}`;
        let vendedor = registro["Vendedor "].trim();
        let lider = registro["LIDER"] ? registro["LIDER"].trim() : "";
        let ventas = parseFloat(registro["Avance de Ventas Totales "]) || 0;

        if (!ventasVendedores[vendedor]) {
          ventasVendedores[vendedor] = {
            lider: lider,
            totalMensual: {},
            totalSemanal: {}
          };
        }

        if (!ventasVendedores[vendedor].totalMensual[mes]) {
          ventasVendedores[vendedor].totalMensual[mes] = 0;
        }
        ventasVendedores[vendedor].totalMensual[mes] += ventas;

        if (!ventasVendedores[vendedor].totalSemanal[semana]) {
          ventasVendedores[vendedor].totalSemanal[semana] = 0;
        }
        ventasVendedores[vendedor].totalSemanal[semana] += ventas;
      });

      calcularPromedios(ventasVendedores); // Calcular promedios
      ventasPorAgencia[agencia] = ventasVendedores;
    });

    return ventasPorAgencia;
  };

  const obtenerPeriodo = () => {
    if (!fechaSeleccionada || !(fechaSeleccionada instanceof Date)) {
      return "";
    }
    return tipoSeleccionado === "totalMensual"
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
    if (!data[agenciaSeleccionada]) return { datos: [], lideres: [] };

    const vendedores = data[agenciaSeleccionada];
    const periodo = obtenerPeriodo();
    let datosFinales = [];

    Object.entries(vendedores).forEach(([vendedor, info]) => {
      const lider = info.lider || "Sin Líder";
      const ventas = info[tipoSeleccionado]?.[periodo] || 0;

      // Si el checkbox correspondiente está desactivado, excluir al vendedor
      const ocultarVendedor =
        (!filterCob && vendedor.includes("VeCob")) ||
        (!filterMay && vendedor.includes("VeMay")) ||
        (!filterHorPan && (vendedor.includes("VePan") || vendedor.includes("VeHor"))) ||
        (!filterMay && vendedor.includes("EsMay")) ||
        (!filterInd && vendedor.includes("VeInd"));

      // Solo incluir vendedores que NO estén en la lista de ocultos
      if (!ocultarVendedor && (liderSeleccionado === "" || lider === liderSeleccionado) && ventas > 0) {
        datosFinales.push({ vendedor, ventas });
      }
    });
// Ordenar de mayor a menor por ventas
datosFinales.sort((a, b) => b.ventas - a.ventas);
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
                <MenuItem value="totalMensual">Mensual</MenuItem>
                <MenuItem value="totalSemanal">Semanal</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Fila para la Fecha */}
        <TextField
          fullWidth
          type={tipoSeleccionado === "totalMensual" ? "month" : "date"}
          label="Fecha"
          value={fechaSeleccionada ? format(fechaSeleccionada, tipoSeleccionado === "totalMensual" ? "yyyy-MM" : "yyyy-MM-dd") : ""}
          onChange={(e) => {
            const fecha = e.target.value;
            const fechaObj = tipoSeleccionado === "totalMensual"
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

        {/* Checkboxes centrados */}
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

        {/* Gráfico de barras */}
        <ResponsiveContainer width="100%" height={500}>
          <BarChart data={procesarDatos().datos} margin={{ top: 20, bottom: 20 }}>
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
              tickFormatter={(tick) => `$${tick.toLocaleString()}`}
              domain={[0, 100]}
              tick={{ fontSize: isMobile ? 8 : 10 }}
            />
            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            <Legend
              layout={window.innerWidth < 600 ? 'horizontal' : 'vertical'}
              align={window.innerWidth < 600 ? 'center' : 'right'}
              verticalAlign={window.innerWidth < 600 ? 'bottom' : 'middle'}
              wrapperStyle={{ fontSize: '10px', marginRight: window.innerWidth < 600 ? '0' : '-30px' }}
            />
            <Bar dataKey="ventas" name="Ventas Totales ($)">
              {procesarDatos().datos.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill="#00BFFF" // Color celeste
                />
              ))}
              <LabelList
                dataKey="ventas"
                position="center"
                angle={-90}
                formatter={(value) => `$${value.toFixed(2)}`}
                style={{ fontSize: isMobile ? 10 : 12, fill: "black" }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default GraficVentaDiaria;