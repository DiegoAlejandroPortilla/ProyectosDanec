import React, { useState, useEffect } from "react";
import { database, ref, onValue } from "../firebaseConfig";
import { es } from "date-fns/locale"; // 🌍 Idioma Español
import { Card, CardContent, Typography, Select, MenuItem, FormControl, InputLabel, Grid, TextField } from "@mui/material";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { format, parseISO, isValid } from "date-fns";
import "./Grafica.css";

const GraficaCompleteRuta = () => {
    const [firebaseData, setFirebaseData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [selectedLider, setSelectedLider] = useState("");
    const [selectedAgencia, setSelectedAgencia] = useState("");
    const [selectedVendedor, setSelectedVendedor] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const agenciasValidas = ["IBA", "CUE"];

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
            if (agenciasValidas.includes(agencia)) {
                Object.values(data[agencia]).forEach((entry) => {
                    if (entry.Fecha && entry["Porcentaje de Cumplimiento de Ruta"]) {
                        let fecha = parseISO(entry.Fecha);
                        if (isValid(fecha)) {
                            formattedData.push({
                                Fecha: fecha.getTime(), // Convertir a timestamp numérico
                                FechaStr: format(fecha, "yyyy-MM-dd"), // Guardar fecha formateada para tooltip
                                Vendedor: entry["Vendedor "] || "Desconocido",
                                Lider: entry.LIDER || "Sin líder",
                                Agencia: agencia,
                                Cumplimiento: parseFloat(entry["Porcentaje de Cumplimiento de Ruta"].replace("%", "")),
                            });
                        }
                    }
                });
            }
        });
        return formattedData.sort((a, b) => a.Fecha - b.Fecha); // Ordenar cronológicamente
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

        // Ordenar por fecha después de filtrar
        filtered.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));

        console.log("📊 Datos filtrados y ordenados:", filtered);
        setFilteredData(filtered);
    }, [firebaseData, selectedAgencia, selectedLider, selectedVendedor, startDate, endDate]);

    const colores = ["#3b82f6", "#f87171", "#34d399", "#facc15", "#a78bfa", "#fb923c", "#22d3ee", "#f472b6"];

    return (
        <Card sx={{ p: 3 }}>
            <CardContent>

                {/* Filtros */}
                <Grid container spacing={2} className="grafica-filtros">
                    <Grid item>
                        <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Agencia</InputLabel>
                            <Select value={selectedAgencia} onChange={(e) => setSelectedAgencia(e.target.value)}>
                                <MenuItem value="">Todas</MenuItem>
                                {agenciasValidas.map((agencia) => (
                                    <MenuItem key={agencia} value={agencia}>{agencia}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    {selectedAgencia && (
                        <Grid item>
                            <FormControl sx={{ minWidth: 120 }}>
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
                        <Grid item>
                            <FormControl sx={{ minWidth: 120 }}>
                                <InputLabel>Vendedor</InputLabel>
                                <Select value={selectedVendedor} onChange={(e) => setSelectedVendedor(e.target.value)}>
                                    <MenuItem value="">Todos</MenuItem>
                                    {[...new Set(firebaseData.filter(d => d.Lider === selectedLider).map((d) => d.Vendedor))].map((vendedor) => (
                                        <MenuItem key={vendedor} value={vendedor}>{vendedor}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                    )}
                    <Grid item>
                        <TextField
                            label="Fecha inicio"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            label="Fecha fin"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </Grid>
                </Grid>

                {/* Gráfica (el marco siempre está, pero las líneas solo aparecen si hay agencia seleccionada) */}
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart
                        data={filteredData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                    >
                        <XAxis
                            dataKey="Fecha"
                            angle={-45}
                            textAnchor="end"
                            type="number" // Asegura que se trata como datos numéricos
                            domain={['dataMin', 'dataMax']} // Ajusta el eje al rango de fechas
                            tickFormatter={(tick) => format(new Date(tick), "dd/MM/yyyy")}
                        />

                        <YAxis domain={[0, 120]} tickFormatter={(tick) => `${tick}%`} />
                        <Tooltip
                            formatter={(value) => `${value}%`}
                            labelFormatter={(label) => {
                                const fecha = new Date(label);
                                return format(fecha, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es });
                            }}
                        />


                        <Legend
                            layout="vertical"
                            align="right"
                            verticalAlign="middle"
                            wrapperStyle={{ fontSize: '10px', marginRight: '-30px' }} // Ajusta el espacio a la izquierda
                        />


                        {/* Renderizar las líneas solo si se ha seleccionado una agencia */}
                        {selectedAgencia &&
                            [...new Set(filteredData.map(d => d.Vendedor))].map((vendedor, index) => (
                                <Line
                                    key={vendedor}
                                    type="monotone"
                                    dataKey="Cumplimiento"
                                    data={filteredData.filter(d => d.Vendedor === vendedor)}
                                    name={vendedor}
                                    stroke={colores[index % colores.length]}
                                    strokeWidth={2}
                                    connectNulls={true}
                                />
                            ))
                        }
                    </LineChart>
                </ResponsiveContainer>




            </CardContent>
        </Card>
    );
};

export default GraficaCompleteRuta;
