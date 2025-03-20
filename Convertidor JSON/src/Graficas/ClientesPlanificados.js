import React, { useState, useEffect } from "react";
import { database, ref, onValue } from "../firebaseConfig";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from "recharts";
import { FormControl, Select, MenuItem, InputLabel, Card, FormControlLabel, FormGroup, CardContent, Grid, TextField, Checkbox } from "@mui/material";
import { format, getISOWeek, parseISO } from "date-fns";

const GraficClientesPlanificados = () => {
    const [data, setData] = useState({});
    const [agenciaSeleccionada, setAgenciaSeleccionada] = useState("");
    const [tipoSeleccionado, setTipoSeleccionado] = useState("mensual");
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
    const [liderSeleccionado, setLiderSeleccionado] = useState("");
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [filterCob, setFilterCob] = useState(true);
    const [filterMay, setFilterMay] = useState(true);
    const [filterHorPan, setFilterHorPan] = useState(true);
    const [filterInd, setFilterInd] = useState(true);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("");
    useEffect(() => {
        const dbRef = ref(database);
        onValue(dbRef, (snapshot) => {
            if (snapshot.exists()) {
                let firebaseData = snapshot.val();
                const clientesPlanificadosPorAgencia = calcularClientesPlanificados(firebaseData);
                setData(clientesPlanificadosPorAgencia);

                const primeraAgencia = Object.keys(clientesPlanificadosPorAgencia)[0] || "";
                setAgenciaSeleccionada(primeraAgencia);
            }
        }, (error) => {
            console.error("❌ Error al obtener datos:", error);
        });
    }, []);


    const calcularClientesPlanificados = (firebaseData) => {
        let clientesPlanificadosPorAgencia = {};
        Object.keys(firebaseData).forEach((agencia) => {
            let registros = firebaseData[agencia];
            let clientesVendedores = {};

            Object.values(registros).forEach((registro) => {
                if (!registro["Fecha"] || !registro["Clientes Planificados"] || !registro["Vendedor "]) return;

                let fecha = new Date(registro["Fecha"]);
                let clientesPlanificados = parseInt(registro["Clientes Planificados"], 10); // Convertir a entero
                let mes = format(fecha, "yyyy-MM");
                let semana = `${format(fecha, "yyyy")}-W${getISOWeek(fecha)}`;
                let vendedor = registro["Vendedor "].trim();
                let lider = registro["LIDER"] ? registro["LIDER"].trim() : "";

                if (!clientesVendedores[vendedor]) {
                    clientesVendedores[vendedor] = {
                        lider: lider,
                        mensual: {},
                        semanal: {},
                        conteoMensual: {}, // Contador de registros por mes
                        conteoSemanal: {}  // Contador de registros por semana
                    };
                }

                // Acumulación de clientes planificados mensual
                if (!clientesVendedores[vendedor].mensual[mes]) {
                    clientesVendedores[vendedor].mensual[mes] = 0;
                    clientesVendedores[vendedor].conteoMensual[mes] = 0;
                }
                clientesVendedores[vendedor].mensual[mes] += clientesPlanificados;
                clientesVendedores[vendedor].conteoMensual[mes] += 1;

                // Acumulación de clientes planificados semanal
                if (!clientesVendedores[vendedor].semanal[semana]) {
                    clientesVendedores[vendedor].semanal[semana] = 0;
                    clientesVendedores[vendedor].conteoSemanal[semana] = 0;
                }
                clientesVendedores[vendedor].semanal[semana] += clientesPlanificados;
                clientesVendedores[vendedor].conteoSemanal[semana] += 1;
            });

            // Calcular promedios
            Object.keys(clientesVendedores).forEach((vendedor) => {
                // Promedio mensual
                Object.keys(clientesVendedores[vendedor].mensual).forEach((mes) => {
                    let suma = clientesVendedores[vendedor].mensual[mes];
                    let conteo = clientesVendedores[vendedor].conteoMensual[mes];
                    clientesVendedores[vendedor].mensual[mes] = Math.round(suma / conteo); // Redondear al entero más cercano
                });

                // Promedio semanal
                Object.keys(clientesVendedores[vendedor].semanal).forEach((semana) => {
                    let suma = clientesVendedores[vendedor].semanal[semana];
                    let conteo = clientesVendedores[vendedor].conteoSemanal[semana];
                    clientesVendedores[vendedor].semanal[semana] = Math.round(suma / conteo); // Redondear al entero más cercano
                });
            });

            clientesPlanificadosPorAgencia[agencia] = clientesVendedores;
        });

        return clientesPlanificadosPorAgencia;
    };

    const obtenerPeriodo = () => {
        if (!fechaSeleccionada || !(fechaSeleccionada instanceof Date)) {
            return "";
        }
        return tipoSeleccionado === "mensual"
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
            const clientesPlanificados = info[tipoSeleccionado]?.[periodo] || 0;

            // 🔹 Filtrar vendedores según la categoría seleccionada en el ComboBox
            const ocultarVendedor =
                (categoriaSeleccionada === "COB" && !vendedor.includes("VeCob")) ||
                (categoriaSeleccionada === "MAY" && !vendedor.includes("VeMay") && !vendedor.includes("EsMay")) ||
                (categoriaSeleccionada === "HOR" && !vendedor.includes("VeHor")) ||
                (categoriaSeleccionada === "PAN" && !vendedor.includes("VePan")) ||
                (categoriaSeleccionada === "IND" && !vendedor.includes("VeInd"));

            // Solo incluir vendedores que cumplen con el filtro de líder, categoría y clientes planificados mayor a 0
            if (!ocultarVendedor && (liderSeleccionado === "" || lider === liderSeleccionado) && clientesPlanificados > 0) {
                datosFinales.push({ vendedor, clientesPlanificados });
            }
        });

        datosFinales = datosFinales.sort((a, b) => b.clientesPlanificados - a.clientesPlanificados); // Ordenar de mayor a menor
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
                                <MenuItem value="mensual">Mensual</MenuItem>
                                <MenuItem value="semanal">Semanal</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                {/* Fila para la Fecha */}
                <TextField
                    fullWidth
                    type={tipoSeleccionado === "mensual" ? "month" : "date"}
                    label="Fecha"
                    value={fechaSeleccionada ? format(fechaSeleccionada, tipoSeleccionado === "mensual" ? "yyyy-MM" : "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                        const fecha = e.target.value;
                        const fechaObj = tipoSeleccionado === "mensual"
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
                            domain={[0, 'dataMax + 10']} // Rango dinámico basado en los datos
                            tick={{ fontSize: isMobile ? 8 : 10 }}
                        />
                        <Tooltip />

                        <Bar dataKey="clientesPlanificados" name="Clientes Planificados">
                            {procesarDatos().datos.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill="#00BFFF" // Color celeste
                                />
                            ))}
                            <LabelList
                                dataKey="clientesPlanificados"
                                position="top"
                                style={{ fontSize: isMobile ? 10 : 12, fill: "black" }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default GraficClientesPlanificados;