import React, { useState, useEffect } from "react";
import { database, ref, onValue } from "../firebaseConfig";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from "recharts";
import { FormControl, Select, MenuItem, InputLabel, Card, FormControlLabel, FormGroup, CardContent, Grid, TextField, Checkbox } from "@mui/material";
import { format, getISOWeek, parseISO } from "date-fns";

const GraficHorasTrabajadas = () => {
    const [data, setData] = useState({});
    const [agenciaSeleccionada, setAgenciaSeleccionada] = useState("");
    const [tipoSeleccionado, setTipoSeleccionado] = useState("horasMensual");
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
                const horasTrabajadasPorAgencia = calcularHorasTrabajadas(firebaseData);
                setData(horasTrabajadasPorAgencia);


                const primeraAgencia = Object.keys(horasTrabajadasPorAgencia)[0] || "";
                setAgenciaSeleccionada(primeraAgencia);
            }
        }, (error) => {
            console.error("❌ Error al obtener datos:", error);
        });
    }, []);


    // Convertir hora en formato "HH:mm:ss" a horas decimales (ej: "08:21:00" -> 8.35)
    const convertirHoraADecimal = (hora) => {
        const [horas, minutos, segundos] = hora.split(":").map(Number);
        return horas + minutos / 60 + segundos / 3600;
    };

    // Convertir horas decimales a formato "HH:mm:ss"
    const convertirDecimalAHora = (decimal) => {
        const horas = Math.floor(decimal);
        const minutos = Math.floor((decimal - horas) * 60);
        const segundos = Math.floor(((decimal - horas) * 60 - minutos) * 60);
        return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
    };

    const calcularHorasTrabajadas = (firebaseData) => {
        let horasTrabajadasPorAgencia = {};
        Object.keys(firebaseData).forEach((agencia) => {
            let registros = firebaseData[agencia];
            let horasTrabajadasVendedores = {};

            Object.values(registros).forEach((registro) => {
                if (!registro["Fecha"] || !registro["Hora Incio_Primer Registro Visita"] || !registro["Hora Fin_Ultimo Registro Visita"] || !registro["Vendedor "]) return;

                let fecha = new Date(registro["Fecha"]);
                let horaInicio = registro["Hora Incio_Primer Registro Visita"];
                let horaFin = registro["Hora Fin_Ultimo Registro Visita"];
                let horasTrabajadas = convertirHoraADecimal(horaFin) - convertirHoraADecimal(horaInicio);
                let mes = format(fecha, "yyyy-MM");
                let semana = `${format(fecha, "yyyy")}-W${getISOWeek(fecha)}`;
                let vendedor = registro["Vendedor "].trim();
                let lider = registro["LIDER"] ? registro["LIDER"].trim() : "";

                if (!horasTrabajadasVendedores[vendedor]) {
                    horasTrabajadasVendedores[vendedor] = {
                        lider: lider,
                        horasMensual: {},
                        horasSemanal: {},
                        conteoMensual: {}, // Contador de registros por mes
                        conteoSemanal: {}  // Contador de registros por semana
                    };
                }

                // Acumulación de las horas trabajadas mensual
                if (!horasTrabajadasVendedores[vendedor].horasMensual[mes]) {
                    horasTrabajadasVendedores[vendedor].horasMensual[mes] = 0;
                    horasTrabajadasVendedores[vendedor].conteoMensual[mes] = 0;
                }
                horasTrabajadasVendedores[vendedor].horasMensual[mes] += horasTrabajadas;
                horasTrabajadasVendedores[vendedor].conteoMensual[mes] += 1;

                // Acumulación de las horas trabajadas semanal
                if (!horasTrabajadasVendedores[vendedor].horasSemanal[semana]) {
                    horasTrabajadasVendedores[vendedor].horasSemanal[semana] = 0;
                    horasTrabajadasVendedores[vendedor].conteoSemanal[semana] = 0;
                }
                horasTrabajadasVendedores[vendedor].horasSemanal[semana] += horasTrabajadas;
                horasTrabajadasVendedores[vendedor].conteoSemanal[semana] += 1;
            });

            // Calcular promedios
            Object.keys(horasTrabajadasVendedores).forEach((vendedor) => {
                // Promedio mensual
                Object.keys(horasTrabajadasVendedores[vendedor].horasMensual).forEach((mes) => {
                    let suma = horasTrabajadasVendedores[vendedor].horasMensual[mes];
                    let conteo = horasTrabajadasVendedores[vendedor].conteoMensual[mes];
                    horasTrabajadasVendedores[vendedor].horasMensual[mes] = suma / conteo;
                });

                // Promedio semanal
                Object.keys(horasTrabajadasVendedores[vendedor].horasSemanal).forEach((semana) => {
                    let suma = horasTrabajadasVendedores[vendedor].horasSemanal[semana];
                    let conteo = horasTrabajadasVendedores[vendedor].conteoSemanal[semana];
                    horasTrabajadasVendedores[vendedor].horasSemanal[semana] = suma / conteo;
                });
            });

            horasTrabajadasPorAgencia[agencia] = horasTrabajadasVendedores;
        });

        return horasTrabajadasPorAgencia;
    };

    const obtenerPeriodo = () => {
        if (!fechaSeleccionada || !(fechaSeleccionada instanceof Date)) {
            return "";
        }
        return tipoSeleccionado === "horasMensual"
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
            const horasTrabajadas = info[tipoSeleccionado]?.[periodo] || 0;

            // 🔹 Filtrar vendedores según la categoría seleccionada en el ComboBox
            const ocultarVendedor =
                (categoriaSeleccionada === "COB" && !vendedor.includes("VeCob")) ||
                (categoriaSeleccionada === "MAY" && !vendedor.includes("VeMay") && !vendedor.includes("EsMay")) ||
                (categoriaSeleccionada === "HOR" && !vendedor.includes("VeHor")) ||
                (categoriaSeleccionada === "PAN" && !vendedor.includes("VePan")) ||
                (categoriaSeleccionada === "IND" && !vendedor.includes("VeInd"));

            // Solo incluir vendedores que cumplen con el filtro de líder, categoría y horas trabajadas mayores a 0
            if (!ocultarVendedor && (liderSeleccionado === "" || lider === liderSeleccionado) && horasTrabajadas > 0) {
                datosFinales.push({ vendedor, horasTrabajadas });
            }
        });

        datosFinales.sort((a, b) => b.horasTrabajadas - a.horasTrabajadas); // Ordenar de mayor a menor
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
                                <MenuItem value="horasMensual">Mensual</MenuItem>
                                <MenuItem value="horasSemanal">Semanal</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                {/* Fila para la Fecha */}
                <TextField
                    fullWidth
                    type={tipoSeleccionado === "horasMensual" ? "month" : "date"}
                    label="Fecha"
                    value={fechaSeleccionada ? format(fechaSeleccionada, tipoSeleccionado === "horasMensual" ? "yyyy-MM" : "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                        const fecha = e.target.value;
                        const fechaObj = tipoSeleccionado === "horasMensual"
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
                            tickFormatter={(tick) => convertirDecimalAHora(tick)} // Mostrar la hora en formato HH:mm:ss
                            domain={[0, 10]} // Rango de horas (0 a 24)
                            tick={{ fontSize: isMobile ? 8 : 10 }}
                        />
                        <Tooltip formatter={(value) => convertirDecimalAHora(value)} />

                        <Bar dataKey="horasTrabajadas" name="Horas Trabajadas">
                            {procesarDatos().datos.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill="#00BFFF" // Color celeste
                                />
                            ))}
                            <LabelList
                                dataKey="horasTrabajadas"
                                position="center"
                                angle={-90}
                                formatter={(value) => convertirDecimalAHora(value)}
                                style={{ fontSize: isMobile ? 10 : 12, fill: "black" }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default GraficHorasTrabajadas;