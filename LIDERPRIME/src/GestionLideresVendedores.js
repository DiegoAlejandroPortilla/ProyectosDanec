import React, { useState, useEffect } from "react";
import {
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Button, TextField, Typography, Box, Modal, MenuItem, Select, FormControl, InputLabel, IconButton, Snackbar
} from "@mui/material";
import MuiAlert from '@mui/material/Alert';
import { database, ref, push, set, remove, onValue } from "./firebaseConfig";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import SearchIcon from "@mui/icons-material/Search";
import { Home, LocalShipping, Group, ShowChart, InsertDriveFile } from "@mui/icons-material";

const VendedorLider = () => {
    const [lideresMap, setLideresMap] = useState({});
    const [agencias, setAgencias] = useState([]);
    const [openModal, setOpenModal] = useState(false);
    const [currentVendedor, setCurrentVendedor] = useState({ id: "", vendedor: "", lider: "", agencia: "" });
    const [isEditMode, setIsEditMode] = useState(false);
    const [nuevaAgencia, setNuevaAgencia] = useState("");
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [searchTerm, setSearchTerm] = useState(""); // Estado para el filtro de búsqueda

    // Cargar datos de Firebase
    useEffect(() => {
        const dbRef = ref(database, 'Data');
        onValue(dbRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const map = {};
                const agenciasSet = new Set();

                Object.entries(data).forEach(([id, vendedorData]) => {
                    const agencia = vendedorData["Agencia"]?.trim() || vendedorData["Agencia "]?.trim();
                    const lider = vendedorData["LIDER"]?.trim() || vendedorData["LIDER "]?.trim();
                    const vendedor = vendedorData["Vendedor"]?.trim() || vendedorData["Vendedor "]?.trim();

                    if (agencia && lider && vendedor) {
                        map[id] = { agencia, lider, vendedor };
                        agenciasSet.add(agencia);
                    }
                });

                setLideresMap(map);
                setAgencias(Array.from(agenciasSet));
            } else {
                console.log("⚠️ No hay datos en Firebase.");
            }
        }, (error) => {
            console.error("❌ Error al obtener datos:", error);
        });
    }, []);

    // Filtrar vendedores según el término de búsqueda
    const filteredVendedores = Object.entries(lideresMap).filter(([id, { vendedor }]) =>
        vendedor.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Funciones para abrir/cerrar el modal
    const handleOpenModal = (vendedor = { id: "", vendedor: "", lider: "", agencia: "" }) => {
        setCurrentVendedor(vendedor);
        setIsEditMode(!!vendedor.id);
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setCurrentVendedor({ id: "", vendedor: "", lider: "", agencia: "" });
        setNuevaAgencia("");
    };

    // Guardar o actualizar un vendedor
    const handleSave = () => {
        const agenciaFinal = nuevaAgencia || currentVendedor.agencia;

        const vendedorData = {
            "Agencia": agenciaFinal,
            "LIDER": currentVendedor.lider,
            "Vendedor": currentVendedor.vendedor
        };

        let dbRef;
        if (isEditMode) {
            dbRef = ref(database, `Data/${currentVendedor.id}`);
        } else {
            dbRef = ref(database, 'Data');
            dbRef = push(dbRef);
        }

        set(dbRef, vendedorData)
            .then(() => {
                if (nuevaAgencia && !agencias.includes(nuevaAgencia)) {
                    setAgencias([...agencias, nuevaAgencia]);
                }
                handleCloseModal();
                setSnackbarMessage(isEditMode ? "Cambio realizado exitosamente." : "Vendedor guardado con éxito.");
                setSnackbarOpen(true);
            })
            .catch((error) => {
                console.error("Error al guardar:", error);
            });
    };

    // Eliminar un vendedor
    const handleDelete = (id) => {
        const confirmDelete = window.confirm("¿Estás seguro de que deseas eliminar este vendedor?");
        if (confirmDelete) {
            const dbRef = ref(database, `Data/${id}`);
            remove(dbRef)
                .then(() => {
                    setSnackbarMessage("Vendedor eliminado con éxito.");
                    setSnackbarOpen(true);
                })
                .catch((error) => {
                    console.error("Error al eliminar:", error);
                });
        }
    };

    return (
        <Box sx={{ padding: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="center" mb={2}>
                <Group sx={{ fontSize: 40, color: "#1976D2", mr: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                    Gestión  Lider - Vendedor 
                </Typography>
            </Box>

            {/* Botón para agregar vendedor */}
            <Button variant="contained" startIcon={<AddCircleIcon />} onClick={() => handleOpenModal()}>
                Agregar Vendedor
            </Button>

            {/* Campo de búsqueda */}
            <Box sx={{ marginTop: 2, marginBottom: 2 }}>
                <TextField
                    fullWidth
                    label="Buscar por Vendedor"
                    variant="outlined"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ marginRight: 1, color: "action.active" }} />,
                    }}
                />
            </Box>

            {/* Tabla de vendedores */}
            <TableContainer component={Paper} sx={{ marginTop: 2, borderRadius: 2, boxShadow: 3 }}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
                            <TableCell sx={{ fontWeight: "bold" }}>Vendedor</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Lider</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Agencia</TableCell>
                            <TableCell sx={{ fontWeight: "bold" }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredVendedores.map(([id, { agencia, lider, vendedor }]) => (
                            <TableRow key={id} hover>
                                <TableCell>{vendedor}</TableCell>
                                <TableCell>{lider}</TableCell>
                                <TableCell>{agencia}</TableCell>
                                <TableCell>
                                    <IconButton onClick={() => handleOpenModal({ id, vendedor, lider, agencia })}>
                                        <EditIcon color="primary" />
                                    </IconButton>
                                    <IconButton onClick={() => handleDelete(id)}>
                                        <DeleteIcon color="error" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Modal para agregar/editar vendedor */}
            <Modal open={openModal} onClose={handleCloseModal}>
                <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 400, bgcolor: 'background.paper', boxShadow: 24, p: 4, borderRadius: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        {isEditMode ? "Editar Vendedor" : "Agregar Vendedor"}
                    </Typography>
                    <TextField
                        fullWidth
                        label="Vendedor"
                        value={currentVendedor.vendedor}
                        onChange={(e) => setCurrentVendedor({ ...currentVendedor, vendedor: e.target.value })}
                        margin="normal"
                    />
                    <TextField
                        fullWidth
                        label="Lider"
                        value={currentVendedor.lider}
                        onChange={(e) => setCurrentVendedor({ ...currentVendedor, lider: e.target.value })}
                        margin="normal"
                    />
                    <FormControl fullWidth margin="normal">
                        <InputLabel>Agencia</InputLabel>
                        <Select
                            value={currentVendedor.agencia}
                            label="Agencia"
                            onChange={(e) => setCurrentVendedor({ ...currentVendedor, agencia: e.target.value })}
                        >
                            {agencias.map((agencia) => (
                                <MenuItem key={agencia} value={agencia}>
                                    {agencia}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Nueva Agencia (opcional)"
                        value={nuevaAgencia}
                        onChange={(e) => setNuevaAgencia(e.target.value)}
                        margin="normal"
                    />
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                        <Button onClick={handleCloseModal} sx={{ marginRight: 1 }}>Cancelar</Button>
                        <Button variant="contained" onClick={handleSave}>Guardar</Button>
                    </Box>
                </Box>
            </Modal>

            {/* Snackbar para mensajes de éxito */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
            >
                <MuiAlert
                    elevation={6}
                    variant="filled"
                    onClose={() => setSnackbarOpen(false)}
                    severity="success"
                >
                    {snackbarMessage}
                </MuiAlert>
            </Snackbar>
        </Box>
    );
};

export default VendedorLider;