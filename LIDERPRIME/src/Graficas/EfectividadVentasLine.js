import React, { useState, useEffect } from "react";
import { database, ref, onValue } from "../firebaseConfig";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card, CardContent, Grid, TextField, FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel, Checkbox } from "@mui/material";
import { format, parseISO, isValid } from "date-fns";
import { es } from "date-fns/locale"; // 🌍 Idioma Español

const GraficEfectividadVentasLine = () => {
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
                let efectividadKey = Object.keys(entry).find(key => key.trim() === "Efectividad de Ventas");
                let vendedorKey = Object.keys(entry).find(key => key.trim() === "Vendedor");
    
                if (entry.Fecha && efectividadKey) {
                    let fecha = parseISO(entry.Fecha);
                    if (isValid(fecha)) {
                        let efectividadValor = entry[efectividadKey];
    
                        // Convertir a número y normalizar a porcentaje
                        let efectividadVentas = 0;
                        if (typeof efectividadValor === "string") {
                            efectividadValor = efectividadValor.replace("%", "").trim();
                        }
                        efectividadVentas = parseFloat(efectividadValor);
    
                        // Si el número está entre 0 y 1, convertirlo a porcentaje
                        if (efectividadVentas <= 1) {
                            efectividadVentas *= 100;
                        }
    
                        // 🔹 Asegurar que el valor tenga solo 2 decimales
                        efectividadVentas = parseFloat(efectividadVentas.toFixed(2));
    
                        formattedData.push({
                            Fecha: fecha.getTime(), // Convertir a timestamp numérico
                            FechaStr: format(fecha, "yyyy-MM-dd"), // Guardar fecha formateada para tooltip
                            Vendedor: entry[vendedorKey] || "Desconocido",
                            Lider: entry.LIDER || "Sin líder",
                            Agencia: agencia,
                            EfectividadVentas: efectividadVentas, // Siempre en porcentaje con 2 decimales
                        });
                    }
                }
            });
        });
    
        return formattedData.sort((a, b) => a.Fecha - b.Fecha); // Ordenar cronológicamente
    };
    
    
    

    useEffect(() => {
        const filtered = firebaseData.filter((item) => {
            const isWithinDateRange =
                (!startDate || new Date(item.Fecha) >= new Date(startDate)) &&
                (!endDate || new Date(item.Fecha) <= new Date(endDate));

            const filtroActivo = filterCob || filterMay || filterHorPan;
            const cumpleFiltro =
                (!filtroActivo ||
                    (filterCob && item.Vendedor.includes("VeCob")) ||
                    (filterMay && item.Vendedor.includes("VeMay")) ||
                    (filterHorPan && item.Vendedor.includes("VePan")));

            return (
                isWithinDateRange &&
                cumpleFiltro &&
                (selectedAgencia === "" || item.Agencia === selectedAgencia) &&
                (selectedLider === "" || item.Lider === selectedLider) &&
                (selectedVendedor === "" || item.Vendedor === selectedVendedor)
            );
        });

        // Ordenar por fecha después de filtrar
        filtered.sort((a, b) => new Date(a.Fecha) - new Date(b.Fecha));

        
        setFilteredData(filtered);
    }, [firebaseData, selectedAgencia, selectedLider, selectedVendedor, startDate, endDate, filterCob, filterMay, filterHorPan]);

    const colores = ["#3b82f6", "#f87171", "#34d399", "#facc15", "#a78bfa", "#fb923c", "#22d3ee", "#f472b6"];

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
                        <YAxis domain={[0, 120]} tickFormatter={(tick) => `${tick.toLocaleString()}%`} />
                        <Tooltip
                            formatter={(value) => `${value}%`}
                            labelFormatter={(label) => {
                                const fecha = new Date(label);
                                return format(fecha, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es });
                            }}
                        />
                        <Legend
                            layout={window.innerWidth < 600 ? 'horizontal' : 'vertical'}
                            align={window.innerWidth < 600 ? 'center' : 'right'}
                            verticalAlign={window.innerWidth < 600 ? 'bottom' : 'middle'}
                            wrapperStyle={{ fontSize: '10px', marginRight: window.innerWidth < 600 ? '0' : '-30px' }}
                        />
                        {/* Renderizar las líneas para todos los vendedores filtrados */}
                        {selectedAgencia &&
                        [...new Set(filteredData.map(d => d.Vendedor))].map((vendedor, index) => (
                            <Line
                                key={vendedor}
                                type="monotone"
                                dataKey="EfectividadVentas" // Cambiar a "EfectividadVentas"
                                data={filteredData.filter(d => d.Vendedor === vendedor)}
                                name={vendedor}
                                stroke={colores[index % colores.length]}
                                strokeWidth={2}
                                connectNulls={true}
                            />
                        ))}

                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
};

export default GraficEfectividadVentasLine;