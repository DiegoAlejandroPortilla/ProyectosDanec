import React, { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Button, Grid, TextField, Typography, Box, Modal, MenuItem, Select, FormControl, InputLabel, Tooltip
} from "@mui/material";
import { styled } from "@mui/material/styles";
import CircleIcon from "@mui/icons-material/Circle";
import CancelIcon from "@mui/icons-material/Cancel";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import html2canvas from "html2canvas";
import { database, ref, push, onValue, get } from "./firebaseConfig";


const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: "background.paper",
    boxShadow: 24,
    p: 4,
    borderRadius: 2,
    textAlign: "center",
};

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.common.white,
    fontWeight: "bold",
    textAlign: "center",
    fontSize: "1.0rem",
}));
const getIconColor = (row) => {
    const ventas = row.Clientes_Con_Venta?.size || 0;
    const sinVenta = row.Clientes_Sin_Venta?.size || 0;
    const fueraRuta = row.cantidadFueraDeRuta || 0;

    if (ventas >= sinVenta && ventas >= fueraRuta) return "green"; // Predomina Clientes con Venta
    if (sinVenta >= ventas && sinVenta >= fueraRuta) return "red"; // Predomina Clientes sin Venta
    if (fueraRuta >= ventas && fueraRuta >= sinVenta) return "yellow"; // Predomina Fuera de Ruta

    return "grey"; // En caso de empate o sin datos
};


const capitalizeName = (name) => {
    if (!name) return ""; // Si no hay nombre, retorna vacío

    // Convertir todo a minúsculas
    const lowerCaseName = name.toLowerCase();

    // Convertir el nombre en un array de caracteres para manipularlo fácilmente
    const nameArray = lowerCaseName.split("");

    // Aplicar mayúsculas a la primera, tercera, sexta y las dos últimas letras
    nameArray[0] = nameArray[0].toUpperCase(); // Primera letra
    if (nameArray.length >= 3) nameArray[2] = nameArray[2].toUpperCase(); // Tercera letra
    if (nameArray.length >= 6) nameArray[5] = nameArray[5].toUpperCase(); // Sexta letra
    if (nameArray.length >= 2) nameArray[nameArray.length - 2] = nameArray[nameArray.length - 2].toUpperCase(); // Penúltima letra
    if (nameArray.length >= 1) nameArray[nameArray.length - 1] = nameArray[nameArray.length - 1].toUpperCase(); // Última letra

    // Unir el array de caracteres en un string
    return nameArray.join("");
};

const getCellStyle = (time, isStartTime) => {
    if (!time) return {};

    const [hours, minutes] = time.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;

    if (isStartTime) {
        if (totalMinutes >= 8 * 60 + 15 && totalMinutes <= 8 * 60 + 59) {
            return { backgroundColor: '#FFF380', color: 'black' }; // Amarillo para 8:15 - 8:59
        } else if (totalMinutes > 9 * 60) {
            return { backgroundColor: '#FF5151', color: 'black' }; // Rojo para > 9:00
        }
    } else if (!isStartTime && totalMinutes < 15 * 60) {
        return { backgroundColor: '#FF5151', color: 'black' }; // Rojo para < 15:00 (3:00 PM)
        //entre 3 y 4 amrillo 
    } else if (!isStartTime && totalMinutes < 16 * 60 && !isStartTime && totalMinutes > 15 * 60) {
        return { backgroundColor: '#FFF380', color: 'black' };
    }



    return {}; // Sin estilo si no cumple ninguna condición
};
const getCumplimientoStyle = (value, isCumplimientoRuta) => {
    if (isCumplimientoRuta) {
        // Elimina el símbolo "%" y convierte el valor a número
        const porcentaje = parseFloat(value);
        if (porcentaje < 50) {
            return { backgroundColor: '#FF5151', color: 'black' }; // Rojo si es menor a 50%
        }
    }
    return {}; // Sin estilo si no cumple la condición
};

const getVisitaStyle = (value, isEfectividadVisitas) => {
    if (isEfectividadVisitas) {
        // Elimina el símbolo "%" y convierte el valor a número
        const porcentaje = parseFloat(value);

        if (porcentaje < 80) {
            return { backgroundColor: '#FF5151', color: 'black' };
        } else if (porcentaje < 90) {
            return { backgroundColor: '#FFF380', color: 'black' };
        }
    }
    return {};
}


const getTrabajdasStyle = (time, isHorasTrabajadas) => {
    if (!isHorasTrabajadas || !time) return {}; // Si no aplica, retorna vacío

    const [hours, minutes] = time.split(":").map(Number);
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes < 7 * 60) {
        return { backgroundColor: '#FF5151', color: 'black' }; // Rojo para menos de 7 horas
    } else if (totalMinutes < 8 * 60) {
        return { backgroundColor: '#FFF380', color: 'black' }; // Amarillo para menos de 8 horas
    }

    return {}; // Si trabaja 8 horas o más, sin estilos
};


const stringToHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
};

const hashToGreyScale = (hash) => {
    // Definir un rango de grises claros (por ejemplo, entre 150 y 230)
    const minGrey = 150;
    const maxGrey = 230;

    // Calcular el valor de gris dentro del rango
    const greyValue = minGrey + (Math.abs(hash) % (maxGrey - minGrey));

    return `rgb(${greyValue}, ${greyValue}, ${greyValue})`;
};

const greyPalette = [
    "#CCCCCC", // Gris claro pero más notorio
    "#D6D6D6", // Gris claro medio
    "#E0E0E0", // Gris claro neutro

    "#F5F5F5", // Gris casi blanco
    "#EAEAEA", // Gris muy claro
    "#FFFFFF", // Blanco puro
];




const getLeaderColor = (leaderName) => {
    const hash = stringToHash(leaderName);
    const index = Math.abs(hash) % greyPalette.length;
    return greyPalette[index];
};

const StyledTableRow = styled(TableRow)(({ leader }) => ({
    backgroundColor: getLeaderColor(leader),
}));

const ExcelReader = () => {
    const [file, setFile] = useState(null);
    const [data, setData] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("tablaCompleta");
    const tableRef = useRef(null);

    // Estado para los modales
    const [openUploadModal, setOpenUploadModal] = useState(false);
    const [openRequestModal, setOpenRequestModal] = useState(false);

    // Datos del usuario para la solicitud de documento
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [selectedLocation, setSelectedLocation] = useState("");
    const [firebaseData, setFirebaseData] = useState({});
    const [lideresMap, setLideresMap] = useState({}); // Nuevo estado para el mapa de líderes
    const [selectedAgency, setSelectedAgency] = useState(""); // Estado para la agencia seleccionada
    const [agencias, setAgencias] = useState([]); // Estado para almacenar las agencias
    const [vendedoresSet, setVendedoresSet] = useState(new Set());
    const [vendedoresFaltantes, setVendedoresFaltantes] = useState([]);

    const getFaltanteStyle = (vendedor) => {
        if (vendedoresFaltantes.includes(vendedor.toUpperCase())) {
            return { backgroundColor: '#ffcccc', color: 'black' }; // Rojo más claro
        }
        return {};
    };


    useEffect(() => {
        const dbRef = ref(database);
        onValue(dbRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();

                const map = {};
                const agenciasSet = new Set();

                if (data.Data) {
                    Object.values(data.Data).forEach(agenciaData => {
                        // Normalizar las claves al leer los datos
                        const vendedor = agenciaData["Vendedor"]?.trim() || agenciaData["Vendedor "]?.trim();
                        const lider = agenciaData["LIDER"]?.trim() || agenciaData["LIDER "]?.trim();
                        const agencia = agenciaData["Agencia"]?.trim() || agenciaData["Agencia "]?.trim();

                        if (vendedor && lider && agencia) {
                            const vendedorNormalizado = vendedor.toUpperCase();
                            map[vendedorNormalizado] = {
                                nombreOriginal: vendedor,
                                lider,
                                agencia
                            };
                            agenciasSet.add(agencia); // Agregar la agencia normalizada
                            vendedoresSet.add(vendedorNormalizado); // Agregar vendedor normalizado
                        }
                    });
                }

                setLideresMap(map);
                setAgencias(Array.from(agenciasSet)); // Guardar las agencias normalizadas
            } else {
                console.log("⚠️ No hay datos en Firebase.");
            }
        }, (error) => {
            console.error("❌ Error al obtener datos:", error);
        });
    }, []);

    const handleFileUpload = (event) => {
        setFile(event.target.files[0]);
    };

    const sendImageToWhatsApp = async () => {
        if (!selectedAgency) {
            alert("⚠️ Por favor, selecciona una agencia antes de enviar el reporte.");
            return;
        }

        if (tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: "smooth", block: "start" });

            setTimeout(() => {
                // Guardar los estilos originales
                const originalStyle = tableRef.current.style.cssText;

                // Aplicar estilos temporales para la captura
                if (filter === "inicioJornada" || filter === "avanceMedioDia") {
                    tableRef.current.style.cssText = "width: 60%; overflow: visible;";
                } else if (filter === "finalizacionJornada") {
                    tableRef.current.style.cssText = "width: 100%; overflow: visible;";
                }


                html2canvas(tableRef.current, {
                    scale: 2, // Reducir la escala para mejorar el rendimiento
                    logging: true,
                    useCORS: true
                }).then((canvas) => {
                    // Mostrar la imagen en una ventana emergente para depuración
                    const img = new Image();
                    img.src = canvas.toDataURL("image/png");
                    document.body.appendChild(img);

                    // Restaurar los estilos originales
                    tableRef.current.style.cssText = originalStyle;

                    const now = new Date();
                    const timestamp = now.toISOString().replace(/[-T:.Z]/g, "").slice(0, 15);
                    const fileName = `Reporte_${selectedAgency}_${timestamp}.png`.replace(/\s+/g, "_");

                    // Guardar la imagen
                    const imgData = canvas.toDataURL("image/png");
                    const link = document.createElement("a");
                    link.href = imgData;
                    link.download = fileName;
                    link.click();
                }).catch((error) => {
                    console.error("Error al capturar la tabla:", error);
                });
            }, 5000); // Aumentar el tiempo de espera a 5 segundos
        }
    };

    const timeToMinutes = (time) => {
        if (!time) return Infinity;
        const [hours, minutes, seconds] = time.split(":").map(Number);
        return hours * 60 + minutes + (seconds / 60);
    };
    const formatTime = (totalMinutes) => {
        if (isNaN(totalMinutes) || totalMinutes <= 0) return "00:00:00";

        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        const seconds = Math.round((totalMinutes % 1) * 60);

        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    };


    const handleProcessFile = () => {
        if (!file) {
            alert("Por favor, selecciona un archivo primero.");
            return;
        }

        const reader = new FileReader();
        reader.readAsBinaryString(file);

        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: "binary" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                let jsonData = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                if (jsonData.length === 0) {
                    alert("No se encontraron datos en la hoja seleccionada.");
                    return;
                }

                // **FILTRADO**: Excluir registros donde 'Codigoak' tiene más de dos caracteres
                jsonData = jsonData.filter(row => (row.Codigoak || "").toString().length <= 2);

                const vendedores = {};

                jsonData.forEach(({ Vendedor, Fecha_Doc, razon, Tipo, programado, Clientes_Programados, Total, hora_inicio, hora_fin, distancia }) => {
                    if (!Vendedor) return;

                    const key = Vendedor;
                    const clientKey = razon;

                    if (!vendedores[key]) {
                        vendedores[key] = {
                            Vendedor,
                            Fecha_Doc,
                            planificados: parseInt(Clientes_Programados) || 0,
                            totalVentas: 0,
                            totalFueraDeRuta: 0,
                            cantidadFueraDeRuta: 0,
                            Clientes_Con_Venta: new Set(),
                            Clientes_Sin_Venta: new Set(),
                            clientesProcesados: new Set(),
                            hora_inicio: null,
                            hora_final: null,
                            tiempoTotalVisitas: 0,
                            cantidadVisitas: 0,
                            clientesEfectivosMenor70: 0,
                            registrosEfectividad: new Map()
                        };
                    }

                    vendedores[key].totalVentas += parseFloat(Total) || 0;

                    // **Registrar hora más temprana como Hora_inicio**
                    if (hora_inicio && (!vendedores[key].hora_inicio || timeToMinutes(hora_inicio) < timeToMinutes(vendedores[key].hora_inicio))) {
                        vendedores[key].hora_inicio = hora_inicio.trim();
                    }

                    // **Registrar hora más tardía como Hora_Fin**
                    if (hora_fin && (!vendedores[key].hora_final || timeToMinutes(hora_fin) > timeToMinutes(vendedores[key].hora_final))) {
                        vendedores[key].hora_final = hora_fin.trim();
                    }

                    // Si es fuera de ruta, igual contabilizar pero sin afectar los cálculos de efectividad
                    if (programado === "FUERA DE RUTA") {
                        vendedores[key].totalFueraDeRuta += parseFloat(Total) || 0;
                        vendedores[key].cantidadFueraDeRuta += 1;
                    } else {
                        vendedores[key].clientesProcesados.add(clientKey);
                    }

                    // Modificación aquí para incluir ambos tipos de registros de efectividad
                    if ((Tipo === "00-Registro de Efectividad de Visita" ||
                        Tipo === "00-Registro de Efectividad de Visita Espejo") &&
                        parseFloat(distancia) <= 50) {
                        if (!vendedores[key].registrosEfectividad.has(razon)) {
                            vendedores[key].registrosEfectividad.set(razon, programado !== "FUERA DE RUTA" ? 1 : 0);
                        }
                    }

                    if (hora_inicio && hora_fin) {
                        const minutosInicio = timeToMinutes(hora_inicio);
                        const minutosFin = timeToMinutes(hora_fin);
                        const duracionVisita = minutosFin - minutosInicio;

                        if (duracionVisita > 0) {
                            vendedores[key].tiempoTotalVisitas += duracionVisita;
                            vendedores[key].cantidadVisitas += 1;
                        }
                    }
                });

                // **Iteración sobre los clientes procesados**
                Object.values(vendedores).forEach(vendedor => {
                    vendedor.clientesProcesados.forEach(cliente => {
                        const tipos = jsonData
                            .filter(entry => entry.Vendedor === vendedor.Vendedor && entry.razon === cliente)
                            .map(entry => entry.Tipo);

                        // Incluir "04-Pedido Contado Cliente Espejo" y "02-Pedido CREDITO o CPP Cliente Espejo" como venta
                        if (
                            tipos.includes("03-Pedido Contado") ||
                            tipos.includes("01-Pedido CREDITO o CPP") ||
                            tipos.includes("04-Pedido Contado Cliente Espejo") ||
                            tipos.includes("02-Pedido CREDITO o CPP Cliente Espejo")
                        ) {
                            vendedor.Clientes_Con_Venta.add(cliente);
                        } else if (
                            tipos.includes("00-Registro de Efectividad de Visita Vendedor") ||
                            tipos.includes("00-Registro de Efectividad de Visita Espejo") ||
                            tipos.includes("20-Cambio de producto")
                        ) {
                            vendedor.Clientes_Sin_Venta.add(cliente);
                        }
                    });

                    // **Cálculo de visitas efectivas**
                    const visitasEfectivas = Array.from(vendedor.registrosEfectividad.values()).filter(value => value > 0).length;
                    vendedor.clientesEfectivosMenor70 = visitasEfectivas;
                    vendedor.efectividadVisitas = vendedor.planificados > 0
                        ? ((visitasEfectivas / vendedor.planificados) * 100).toFixed(2) + "%"
                        : "S/P";

                    vendedor.cumplimientoRuta = vendedor.planificados > 0
                        ? (((vendedor.Clientes_Con_Venta.size + vendedor.Clientes_Sin_Venta.size) / vendedor.planificados) * 100).toFixed(2) + "%"
                        : "S/P";
                });

                // **Conversión final de datos**
                const processedData = Object.values(vendedores).map(vendedor => {
                    const vendedorNormalizado = vendedor.Vendedor.toUpperCase().trim(); // Normalizar el nombre
                    const totalClientes = Number(vendedor.Clientes_Con_Venta.size) + Number(vendedor.cantidadFueraDeRuta);

                    return {
                        ...vendedor,
                        Lider: lideresMap[vendedorNormalizado]?.lider || "Sin Líder", // Buscar líder en el mapa
                        totalClientes,
                        clientesTotales: vendedor.Clientes_Con_Venta.size + vendedor.Clientes_Sin_Venta.size,
                        cumplimientoRuta: vendedor.planificados > 0
                            ? (Math.min(((vendedor.Clientes_Con_Venta.size + vendedor.Clientes_Sin_Venta.size) / vendedor.planificados) * 100, 100)).toFixed(2) + "%"
                            : "S/P",
                        ticketPromedio: totalClientes > 0
                            ? "$" + (vendedor.totalVentas / totalClientes).toFixed(2)
                            : "$0.00",
                        tiempoPromedioVisitas: vendedor.cantidadVisitas > 0
                            ? formatTime(vendedor.tiempoTotalVisitas / vendedor.cantidadVisitas)
                            : "00:00:00",
                        horasTrabajadas: vendedor.hora_inicio && vendedor.hora_final
                            ? formatTime(timeToMinutes(vendedor.hora_final) - timeToMinutes(vendedor.hora_inicio))
                            : "00:00:00",
                        efectividadVentas: vendedor.planificados > 0
                            ? ((parseFloat(vendedor.Clientes_Con_Venta.size) / parseFloat(vendedor.planificados)) * 100).toFixed(2) + "%"
                            : "S/P",
                        valorPorCliente: vendedor.clientesProcesados.size > 0
                            ? "$" + (vendedor.totalVentas / vendedor.clientesProcesados.size).toFixed(2)
                            : "$0.00",
                        clientessinVisitayVenta: ((vendedor.Clientes_Con_Venta.size + vendedor.Clientes_Sin_Venta.size) - vendedor.planificados),
                        valorTotalFueraRuta: "$" + vendedor.totalFueraDeRuta.toFixed(2)
                    };
                });

                // Identificar vendedores faltantes
                const vendedoresProcesados = processedData.map(row => row.Vendedor.toUpperCase().trim());
                const faltantes = Array.from(vendedoresSet).filter(v => !vendedoresProcesados.includes(v.toUpperCase()));

                // Actualizar el estado de vendedoresFaltantes
                setVendedoresFaltantes(faltantes);

                // Agregar vendedores faltantes a los datos procesados
                faltantes.forEach(vendedor => {
                    processedData.push({
                        Vendedor: vendedor,
                        Lider: lideresMap[vendedor.toUpperCase()]?.lider || "Sin Líder",
                        Fecha_Doc: jsonData[0].Fecha_Doc, // Usar la fecha del primer registro de jsonData
                        planificados: 0,
                        totalVentas: 0,
                        totalFueraDeRuta: 0,
                        cantidadFueraDeRuta: 0,
                        Clientes_Con_Venta: new Set(), // Usar un Set vacío
                        Clientes_Sin_Venta: new Set(), // Usar un Set vacío
                        clientesProcesados: new Set(), // Usar un Set vacío
                        hora_inicio: "00:00:00",
                        hora_final: "00:00:00",
                        tiempoTotalVisitas: 0,
                        cantidadVisitas: 0,
                        clientesEfectivosMenor70: 0,
                        registrosEfectividad: new Map(), // Usar un Map vacío
                        cumplimientoRuta: "0%", // Cumplimiento de ruta es 0%
                        ticketPromedio: "$0.00", // Ticket promedio es $0.00
                        tiempoPromedioVisitas: "00:00:00", // Tiempo promedio de visitas es 00:00:00
                        horasTrabajadas: "00:00:00", // Horas trabajadas es 00:00:00
                        efectividadVentas: "0%", // Efectividad de ventas es 0%
                        efectividadVisitas: "0%", // Efectividad de visitas es 0%
                        valorPorCliente: "$0.00", // Valor por cliente es $0.00
                        clientessinVisitayVenta: 0, // Clientes sin visita y venta es 0
                        valorTotalFueraRuta: "$0.00", // Valor total fuera de ruta es $0.00
                        clientesTotales: 0 // Clientes totales es 0
                       
                    });
                });


                setData(processedData);
            } catch (error) {
                alert("Error al leer el archivo. Asegúrate de que tenga datos y esté bien formateado.");
            }
        };
    };

    const handleFilterChange = (event) => {
        setFilter(event.target.value);
    };

    const filteredData = useMemo(() => {
        // Filtrar los datos según el término de búsqueda
        let filtered = data.filter(row =>
            row.Vendedor?.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Filtrar por agencia si está seleccionada
        if (selectedAgency) {
            filtered = filtered.filter(row => {
                const vendedorNormalizado = row.Vendedor?.toUpperCase().trim();
                const agencia = lideresMap[vendedorNormalizado]?.agencia;
                return agencia === selectedAgency;
            });
        }

        // Agrupar por líder
        const groupedByLider = filtered.reduce((acc, row) => {
            const lider = row.Lider || "Sin Líder"; // Usar "Sin Líder" si no hay líder asignado
            if (!acc[lider]) {
                acc[lider] = [];
            }
            acc[lider].push(row);
            return acc;
        }, {});

        // Ordenar los líderes alfabéticamente
        const sortedLideres = Object.keys(groupedByLider).sort((a, b) =>
            a.localeCompare(b, "es", { sensitivity: "base" }) // Orden alfabético considerando español
        );

        // Aplicar filtros y devolver los datos agrupados
        return sortedLideres.flatMap(lider => {
            const liderRows = groupedByLider[lider];
            switch (filter) {
                case "inicioJornada":
                    return liderRows.map(row => ({
                        Lider: row.Lider,
                        Vendedor: row.Vendedor,
                        Fecha: row.Fecha_Doc,
                        Planificados: row.planificados,
                        HoraInicio: row.hora_inicio
                    }));
                case "avanceMedioDia":
                    return liderRows.map(row => ({
                        Lider: row.Lider,
                        Vendedor: row.Vendedor,
                        Fecha: row.Fecha_Doc,
                        ClientesPlanificados: row.planificados,
                        CumplimientoRuta: row.cumplimientoRuta,
                        ValorTotal: row.totalVentas
                    }));
                case "finalizacionJornada":
                    return liderRows.map(row => ({
                        Lider: row.Lider,
                        Vendedor: row.Vendedor,
                        Fecha: row.Fecha_Doc,
                        Planificados: row.planificados,
                        Totales: row.clientesTotales,
                        ClientesConVenta: row.Clientes_Con_Venta.size,
                        EfectividadVisitas: row.efectividadVisitas,
                        EfectividadVentas: row.efectividadVentas,
                        ValorTotal: row.totalVentas,
                        HoraInicio: row.hora_inicio,
                        HoraFin: row.hora_final,
                        HorasTrabajadas: row.horasTrabajadas,
                        TiempoPromedioVisitas: row.tiempoPromedioVisitas,
                    }));
                default: // tablaCompleta
                    return liderRows;
            }
        });
    }, [data, searchTerm, filter, selectedAgency, lideresMap]);
    const exportToExcel = () => {
        // Ordenar los datos por líder
        const sortedData = data.sort((a, b) => a.Lider.localeCompare(b.Lider));

        // Crear la hoja de Excel con los datos ordenados
        const ws = XLSX.utils.json_to_sheet(
            sortedData.map(row => ({
                Líder: row.Lider,
                Vendedor: capitalizeName(row.Vendedor), // Formatear el nombre del vendedor
                Fecha: row.Fecha_Doc,
                Planificados: row.planificados,
                "Hora Inicio": row.hora_inicio || "Sin registro",
                "Clientes Atendidos en Ruta": row.Clientes_Con_Venta.size + row.Clientes_Sin_Venta.size,
                "Clientes con Venta en la Ruta": row.Clientes_Con_Venta.size,
                "Clientes sin Venta en la Ruta": row.Clientes_Sin_Venta.size,
                "Cumplimiento de Ruta": row.cumplimientoRuta,
                "Efectividad de Visitas (50 m)": row.efectividadVisitas,
                "Efectividad Ventas": row.efectividadVentas,
                "Ventas Totales": row.totalVentas,
                "Ticket Promedio": row.ticketPromedio,
                "Hora Fin": row.hora_final || "Sin registro",
                "Tiempo Promedio Visitas": row.tiempoPromedioVisitas,
                "Horas Trabajadas": row.horasTrabajadas,

            }))
        );

        // Crear el libro de Excel y agregar la hoja
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Reporte");

        // Exportar el archivo Excel
        XLSX.writeFile(wb, "Reporte_Vendedores.xlsx");
    };

    const exportTableToPNG = () => {
        if (tableRef.current) {
            html2canvas(tableRef.current).then((canvas) => {
                const imgData = canvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.href = imgData;
                link.download = "tabla_vendedores.png";
                link.click();
            });
        }
    };



    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                <AttachMoneyIcon sx={{ fontSize: 40, color: "#1976D2", mr: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                    Extracción Datos Vendedor
                </Typography>
            </Box>
            <Grid container spacing={2} alignItems="center">
                <Grid item>
                    <Button variant="contained" component="label" sx={{ textTransform: "none" }}>
                        Subir Archivo
                        <input type="file" accept=".xls,.xlsx" hidden onChange={handleFileUpload} />
                    </Button>
                </Grid>

                {file && (
                    <Grid item>
                        <Typography>{file.name}</Typography>
                    </Grid>
                )}

                <Grid item>
                    <Button variant="contained" color="primary" onClick={handleProcessFile} sx={{ textTransform: "none" }}>
                        Procesar Archivo
                    </Button>

                    <Button variant="contained" color="secondary" onClick={exportToExcel} sx={{ textTransform: "none" }} disabled={data.length === 0}>
                        Exportar a Excel
                    </Button>

                    <Button variant="contained" color="success" onClick={sendImageToWhatsApp} sx={{ textTransform: "none" }} disabled={data.length === 0}>
                        Exportar Imagen
                    </Button>
                </Grid>
            </Grid>
            <br></br>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={4}>
                    <TextField
                        label="Buscar Vendedor"
                        variant="outlined"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        fullWidth
                        sx={{ '& .MuiInputBase-input': { height: '20px', fontSize: '1.2rem' } }}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl variant="outlined" fullWidth>
                        <InputLabel>Filtro</InputLabel>
                        <Select
                            value={filter}
                            onChange={handleFilterChange}
                            label="Filtro"
                            sx={{ fontSize: '1.2rem', height: '56px' }}
                        >
                            <MenuItem value="tablaCompleta">Tabla Completa</MenuItem>
                            <MenuItem value="inicioJornada">Alerta de Inicio de Jornada</MenuItem>
                            <MenuItem value="avanceMedioDia">Alerta de Avance Medio Día</MenuItem>
                            <MenuItem value="finalizacionJornada">Alerta de Finalización de Jornada</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <FormControl variant="outlined" fullWidth>
                        <InputLabel>Agencia</InputLabel>
                        <Select
                            value={selectedAgency}
                            onChange={(e) => setSelectedAgency(e.target.value)}
                            label="Agencia"
                            sx={{ fontSize: '1.2rem', height: '56px' }}
                        >
                            <MenuItem value="">Todas las agencias</MenuItem>
                            {agencias.map((agencia, index) => (
                                <MenuItem key={index} value={agencia}>{agencia}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>

            </Grid>


            <TableContainer component={Paper} sx={{ mt: 3, borderRadius: 2, overflow: "hidden" }} ref={tableRef}>
                <Table sx={{ minWidth: 650 }} >

                    <TableHead>
                        <TableRow>
                            {filter === "tablaCompleta" && (
                                <>
                                    <StyledTableCell>Vendedor</StyledTableCell>
                                    <StyledTableCell>Líder</StyledTableCell>
                                    <StyledTableCell>Fecha</StyledTableCell>
                                    <StyledTableCell>Planificados</StyledTableCell>
                                    <StyledTableCell>Cumplimiento Ruta</StyledTableCell>
                                    <StyledTableCell>Efectividad Visitas (50 m)</StyledTableCell>
                                    <StyledTableCell>Efectividad de Ventas</StyledTableCell>
                                    <StyledTableCell>Valor Total</StyledTableCell>
                                    <StyledTableCell>Valor Total FUERA DE RUTA</StyledTableCell>
                                    <StyledTableCell>Ticket Promedio</StyledTableCell>
                                    <StyledTableCell>Hora Inicio</StyledTableCell>
                                    <StyledTableCell>Hora Fin</StyledTableCell>
                                    <StyledTableCell>Tiempo Promedio Visitas</StyledTableCell>
                                    <StyledTableCell>Horas Trabajadas</StyledTableCell>
                                    
                                </>
                            )}
                            {filter === "inicioJornada" && (
                                <>
                                    <StyledTableCell>Líder</StyledTableCell>
                                    <StyledTableCell>Vendedor</StyledTableCell>
                                    <StyledTableCell>Fecha</StyledTableCell>
                                    <StyledTableCell>Planificados</StyledTableCell>
                                    <StyledTableCell>Hora Inicio</StyledTableCell>
                                </>
                            )}
                            {filter === "avanceMedioDia" && (
                                <>
                                    <StyledTableCell>Líder</StyledTableCell>
                                    <StyledTableCell>Vendedor</StyledTableCell>
                                    <StyledTableCell>Fecha</StyledTableCell>
                                    <StyledTableCell>Clientes Planificados</StyledTableCell>
                                    <StyledTableCell>Cumplimiento de Ruta</StyledTableCell>
                                    <StyledTableCell>Valor Total</StyledTableCell>
                                </>
                            )}
                            {filter === "finalizacionJornada" && (
                                <>
                                    <StyledTableCell>Líder</StyledTableCell>
                                    <StyledTableCell>Vendedor</StyledTableCell>
                                    <StyledTableCell>Fecha</StyledTableCell>
                                    <StyledTableCell>Planificados</StyledTableCell>
                                    <StyledTableCell>Clientes Atendidos en Ruta</StyledTableCell>
                                    <StyledTableCell>Clientes con Venta</StyledTableCell>
                                    <StyledTableCell>Efectividad de Visitas (50m)</StyledTableCell>
                                    <StyledTableCell>Efectividad de Ventas</StyledTableCell>
                                    <StyledTableCell>Ventas Totales</StyledTableCell>
                                    <StyledTableCell>Hora Inicio</StyledTableCell>
                                    <StyledTableCell>Hora Fin</StyledTableCell>
                                    <StyledTableCell>Horas Trabajadas</StyledTableCell>
                                    <StyledTableCell>Tiempo Promedio Visitas</StyledTableCell>
                                </>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredData.map((row, index,) => (
                            <StyledTableRow leader={row.Lider} key={index} style={getFaltanteStyle(row.Vendedor)}>
                                {filter === "tablaCompleta" && (
                                    <>
                                        <Tooltip
                                            title={
                                                <Box>
                                                    <Box display="flex" alignItems="center">
                                                        <AttachMoneyIcon fontSize="small" style={{ color: "white", marginRight: 4 }} /> Clientes con Venta: {row.Clientes_Con_Venta?.size || 0}
                                                    </Box>
                                                    <Box display="flex" alignItems="center">
                                                        <CancelIcon fontSize="small" style={{ color: "#8B0000", marginRight: 4 }} /> Clientes sin Venta: {row.Clientes_Sin_Venta?.size || 0}
                                                    </Box>
                                                    <Box display="flex" alignItems="center">
                                                        < WarningAmberIcon fontSize="small" style={{ color: "yellow", marginRight: 4 }} />
                                                        Clientes sin venta , ni visita: {Math.abs(row.clientessinVisitayVenta || 0)}
                                                    </Box>

                                                    <Box display="flex" alignItems="center">
                                                        <GpsFixedIcon fontSize="small" style={{ color: "blue", marginRight: 4 }} />
                                                        Visitas en rango (50m): {row?.clientesEfectivosMenor70 ?? 0}
                                                    </Box>

                                                    <Box display="flex" alignItems="center">
                                                        <CircleIcon fontSize="small" style={{ color: "orange", marginRight: 4 }} /> FUERA DE RUTA: {row.cantidadFueraDeRuta || 0}
                                                    </Box>
                                                </Box>
                                            }
                                            arrow>
                                            <TableCell sx={{ textAlign: "center", width: "200px" }}>
                                                <CircleIcon fontSize="small" style={{ color: getIconColor(row), marginRight: 2 }} />
                                                {capitalizeName(row.Vendedor)}
                                            </TableCell>
                                        </Tooltip>
                                        <TableCell
                                            key={index}
                                            sx={{
                                                textAlign: "center",
                                                borderBottom: "2px solid #ddd",
                                                fontWeight: "bold",
                                                width: "200px"
                                            }}
                                        >
                                            {row.Lider}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.Fecha_Doc}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.planificados}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.cumplimientoRuta}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.efectividadVisitas}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.efectividadVentas}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{"$" + (row.totalVentas?.toFixed(2) || "0.00")}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.valorTotalFueraRuta}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.ticketPromedio}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center", ...getCellStyle(row.hora_inicio, true) }}>
                                            {row.hora_inicio || "Sin registro"}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center", ...getCellStyle(row.hora_final, false) }}>
                                            {row.hora_final || "Sin registro"}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.tiempoPromedioVisitas}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.horasTrabajadas}</TableCell>
                                    </>
                                )}
                                {filter === "inicioJornada" && (

                                    <>
                                        <TableCell
                                            key={index}
                                            sx={{
                                                textAlign: "center",
                                                borderBottom: "2px solid #ddd",
                                                fontWeight: "bold",
                                                fontSize: "1.0rem",
                                                width: "200px"
                                            }}
                                        >
                                            {row.Lider}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center", ...getFaltanteStyle(row.Vendedor, vendedoresFaltantes) }}>
                                            {capitalizeName(row.Vendedor)}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.Fecha}</TableCell>
                                        <TableCell sx={{ textAlign: "center", fontSize: "1.2rem", }}>{row.Planificados}</TableCell>
                                        <TableCell sx={{ textAlign: "center", ...getCellStyle(row.HoraInicio, true), fontSize: "1.2rem", }}>
                                            {row.HoraInicio || "Sin registro"}
                                        </TableCell>
                                    </>
                                )}
                                {filter === "avanceMedioDia" && (
                                    <>
                                        <TableCell
                                            key={index}
                                            sx={{
                                                textAlign: "center",
                                                borderBottom: "2px solid #ddd",
                                                fontWeight: "bold",
                                                width: "200px",
                                                fontSize: "1.0rem"
                                            }}
                                        >
                                            {row.Lider}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center", ...getFaltanteStyle(row.Vendedor, vendedoresFaltantes) }}>
                                            {capitalizeName(row.Vendedor)}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.Fecha}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.ClientesPlanificados}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center", ...getCumplimientoStyle(row.CumplimientoRuta, true) }}>
                                            {row.CumplimientoRuta}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{"$" + (row.ValorTotal?.toFixed(2) || "0.00")}</TableCell>
                                    </>
                                )}
                                {filter === "finalizacionJornada" && (
                                    <>
                                        <TableCell
                                            key={index}
                                            sx={{
                                                textAlign: "center",
                                                borderBottom: "2px solid #ddd",
                                                fontWeight: "bold",
                                                width: "200px",
                                                fontSize: "1.2rem"
                                            }}
                                        >
                                            {row.Lider}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center", ...getFaltanteStyle(row.Vendedor, vendedoresFaltantes) }}>
                                            {capitalizeName(row.Vendedor)}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.Fecha}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.Planificados}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.Totales}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.ClientesConVenta}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center", ...getVisitaStyle(row.EfectividadVisitas, true) }}>{row.EfectividadVisitas}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.EfectividadVentas}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{"$" + (row.ValorTotal?.toFixed(2) || "0.00")}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center", ...getCellStyle(row.HoraInicio, true) }}>
                                            {row.HoraInicio || "Sin registro"}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center", ...getCellStyle(row.HoraFin, false) }}>
                                            {row.HoraFin || "Sin registro"}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center", ...getTrabajdasStyle(row.HorasTrabajadas, true) }}>{row.HorasTrabajadas || "Sin registro"}</TableCell>
                                        <TableCell sx={{ fontSize: "1.2rem", textAlign: "center" }}>{row.TiempoPromedioVisitas}</TableCell>
                                    </>
                                )}
                            </StyledTableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

};

export default ExcelReader;
