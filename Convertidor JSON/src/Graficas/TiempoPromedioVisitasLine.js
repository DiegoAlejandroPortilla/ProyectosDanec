import React, { useState, useEffect } from "react";
import { database, ref, onValue } from "../firebaseConfig";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, Grid, TextField, FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel, Checkbox } from "@mui/material";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale"; // 🌍 Idioma Español

const GraficTiempoPromedioVisitasLine = () => {
    const [firebaseData, setFirebaseData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [selectedAgencia, setSelectedAgencia] = useState("");
    const [selectedLider, setSelectedLider] = useState("");
    const [selectedVendedor, setSelectedVendedor] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [filterCob, setFilterCob] = useState(false);
    const [filterMay, setFilterMay] = useState(false);
    const [filterHorPan, setFilterHorPan] = useState(false);

    useEffect(() => {
        const dbRef = ref(database);
        onValue(dbRef, (snapshot) => {
            if (snapshot.exists()) {
                let data = formatRetrievedData(snapshot.val());
                setFirebaseData(data);
            } else {
                console.log("⚠️ No hay datos en Firebase.");
            }
        }, (error) => {
            console.error("❌ Error al obtener datos:", error);
        });
    }, []);

    const formatRetrievedData = (data) => {
        let formattedData = [];
        Object.keys(data).forEach((agencia) => {
            Object.values(data[agencia]).forEach((entry) => {
                if (entry.Fecha && entry["Hora Incio_Primer Registro Visita"]) {
                    let fecha = parseISO(entry.Fecha);
                    if (isValid(fecha)) {
                        const horaInicio = entry["Hora Incio_Primer Registro Visita"];
                        const [horas, minutos, segundos] = horaInicio.split(':').map(Number);
                        const totalSegundos = horas * 3600 + minutos * 60 + segundos;

                        formattedData.push({
                            Fecha: fecha.getTime(),
                            FechaStr: format(fecha, "yyyy-MM-dd"),
                            Vendedor: entry["Ruta "] || "Desconocido",
                            Lider: entry.LIDER || "Sin líder",
                            Agencia: agencia,
                            HoraInicio: totalSegundos,
                        });
                    }
                }
            });
        });
        return formattedData.sort((a, b) => a.Fecha - b.Fecha);
    };

    useEffect(() => {
        const filtered = firebaseData.filter((item) => {
            const isWithinDateRange =
                (!startDate || new Date(item.Fecha) >= new Date(startDate)) &&
                (!endDate || new Date(item.Fecha) <= new Date(endDate));
            return (
                isWithinDateRange &&
                (selectedAgencia === "" || item.Agencia === selectedAgencia) &&
                (selectedLider === "" || item.Lider === selectedLider) &&
                (selectedVendedor === "" || item.Vendedor === selectedVendedor)
            );
        });

        const groupedData = filtered.reduce((acc, item) => {
            const fechaStr = item.FechaStr;
            if (!acc[fechaStr]) {
                acc[fechaStr] = { Fecha: item.Fecha, FechaStr: fechaStr, totalSegundos: 0, count: 0 };
            }
            acc[fechaStr].totalSegundos += item.HoraInicio;
            acc[fechaStr].count += 1;
            return acc;
        }, {});

        const averagedData = Object.values(groupedData).map((item) => ({
            Fecha: item.Fecha,
            FechaStr: item.FechaStr,
            TiempoPromedio: Math.round(item.totalSegundos / item.count), // Asegurar que es un valor en segundos
        }));

        averagedData.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));

        setFilteredData(averagedData);
    }, [firebaseData, selectedAgencia, selectedLider, selectedVendedor, startDate, endDate]);

    const formatSecondsToTime = (seconds) => {
        const horas = Math.floor(seconds / 3600);
        const minutos = Math.floor((seconds % 3600) / 60);
        const segundosRestantes = Math.floor(seconds % 60);
        return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundosRestantes).padStart(2, '0')}`;
    };


    return (
        <Card sx={{ p: { xs: 1, sm: 3 }, maxWidth: '100%' }}>
            <CardContent>
                {/* Filtros */}
                <Grid container spacing={2} className="grafica-filtros" direction={{ xs: 'column', sm: 'row' }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Agencia</InputLabel>
                            <Select value={selectedAgencia} onChange={(e) => setSelectedAgencia(e.target.value)}>
                                <MenuItem value="">Todas</MenuItem>
                                {[...new Set(firebaseData.map((d) => d.Agencia))].map((agencia) => (
                                    <MenuItem key={agencia} value={agencia}>{agencia}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    {selectedAgencia && (
                        <Grid item xs={12} sm={6} md={3}>
                            <FormControl fullWidth>
                                <InputLabel>Líder</InputLabel>
                                <Select value={selectedLider} onChange={(e) => setSelectedLider(e.target.value)}>
                                    <MenuItem value="">Todos</MenuItem>
                                    {[...new Set(firebaseData.filter(d => d.Agencia === selectedAgencia).map((d) => d.Lider))].map((lider) => (
                                        <MenuItem key={lider} value={lider}>{lider}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    )}
                    {selectedLider && (
                        <Grid item xs={12} sm={6} md={3}>
                            <FormControl fullWidth>
                                <InputLabel>Ruta</InputLabel>
                                <Select value={selectedVendedor} onChange={(e) => setSelectedVendedor(e.target.value)}>
                                    <MenuItem value="">Todos</MenuItem>
                                    {[...new Set(firebaseData.filter(d => d.Lider === selectedLider).map((d) => d.Vendedor))].map((vendedor) => (
                                        <MenuItem key={vendedor} value={vendedor}>{vendedor}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    )}
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            label="Fecha inicio"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <TextField
                            fullWidth
                            label="Fecha fin"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </Grid>
                </Grid>

                {/* Gráfica de líneas */}
                <ResponsiveContainer width="100%" height={window.innerWidth < 600 ? 300 : 400}>
                    <LineChart
                        data={filteredData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                    >
                        <XAxis
                            dataKey="Fecha"
                            angle={window.innerWidth < 600 ? -90 : -45}
                            textAnchor="end"
                            type="number"
                            domain={['dataMin', 'dataMax']}
                            tickFormatter={(tick) => format(new Date(tick), "dd/MM/yyyy")}
                        />
                        <YAxis
                            tickFormatter={(tick) => formatSecondsToTime(tick)}
                        />
                        <Tooltip
                           formatter={(value) => formatSecondsToTime(value)}
                            labelFormatter={(label) => {
                                return format(new Date(label), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es });
                            }}
                        />
                        <Legend
                            layout={window.innerWidth < 600 ? 'horizontal' : 'vertical'}
                            align={window.innerWidth < 600 ? 'center' : 'right'}
                            verticalAlign={window.innerWidth < 600 ? 'bottom' : 'middle'}
                            wrapperStyle={{ fontSize: '10px', marginRight: window.innerWidth < 600 ? '0' : '-30px' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="TiempoPromedio"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            connectNulls={true}
                            name="Tiempo Promedio de Visitas"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default GraficTiempoPromedioVisitasLine;