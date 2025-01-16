import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

function ExcelToJsonConverter() {
    const [excelFile, setExcelFile] = useState(null);
    const [fileName, setFileName] = useState('');
    const [jsonPreview, setJsonPreview] = useState('');

    const handleFileUpload = (event) => {
        setExcelFile(event.target.files[0]);
    };

    const handleFileNameChange = (event) => {
        setFileName(event.target.value);
    };

    function formatFecha(fecha) {
        if (typeof fecha === 'number') {
            // Convierte el número serial de Excel a una fecha
            const parsedDate = XLSX.SSF.parse_date_code(fecha);
            return `${parsedDate.y}/${String(parsedDate.m).padStart(2, '0')}/${String(parsedDate.d).padStart(2, '0')}`;
        }
        if (typeof fecha === 'string') {
            // Maneja el caso de cadenas en formato "DD/MM/YYYY"
            const [día, mes, año] = fecha.split('/');
            return `${año}/${mes.padStart(2, '0')}/${día.padStart(2, '0')}`;
        }
        return null; // Maneja valores nulos o no válidos
    }

    const processExcelToJson = async () => {
        if (!excelFile) {
            alert('Por favor, selecciona un archivo Excel.');
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // Asume que los datos están en la primera hoja
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: null });

            // Procesamiento de datos para estructurar JSON
            const consolidatedData = [];
            console.log(jsonData);
            console.log(consolidatedData);
            const groupedData = groupBy(jsonData, ['CLIENTE', 'NUMERODOCUMENTO']);

            Object.entries(groupedData).forEach(([key, rows]) => {
                const [clientId, documentId] = key.split(',');
                consolidatedData.push({
                    Empresa: String(rows[0].EMPRESA).trim(),
                    TipoDocumento: String(rows[0].TIPODOCUMENTO).trim(),
                    Serie: String(rows[0].SERIE).trim(),
                    NumeroDocumento: parseInt(documentId),
                    Cliente: String(clientId).trim(),
                    Sucursal: parseInt(rows[0].SUCURSAL),
                    Deposito: String(rows[0].DEPOSITO).trim(),
                    ListaPrecio: parseInt(rows[0].LISTAPRECIO),
                    Moneda: parseInt(rows[0].MONEDA),
                    Vendedor: String(rows[0].VENDEDOR).trim(),
                    Itinerario: String(rows[0].ITINERARIO).trim(),
                    Fecha: formatFecha(rows[0].FECHA),
                    FechaVencimiento: formatFecha(rows[0].FECHAVENCIMIENTO),
                    FechaEntrega: formatFecha(rows[0].FECHAENTREGA),
                    Observaciones: String(rows[0].OBSERVACIONES).trim(),
                    Observaciones2: String(rows[0].OBSERVACIONES2).trim(),
                    NumeroPedido: String(rows[0].NUMEROPEDIDO).trim(),
                    NroTranspo: String(rows[0].TRANSPORTISTA).trim(),
                    NroPlaca: String(rows[0].PLACA).trim(),
                    NroCarga: String(rows[0].NROEMBARQUE).trim(),
                    TipoDocJDE: String(rows[0].TIPODOCUMENTOSJDE).trim(),
                    CondicionP: String(rows[0].CONDICIONPAGO).trim(),
                    TotFacJDE: String(rows[0].TOTFACTJDE).trim(),
                    Items: rows.map(row => ({
                        Articulo: String(row.ARTICULO).trim(),
                        CodReglon: String(row.CODRENGLON).trim(),
                        Cantidad: parseInt(row.CANTIDAD),
                        PrecioVenta: parseFloat(String(row.PRECIOVENTA).replace(',', '.').trim()),
                        PorcDescuento: parseInt(row.PORCDESCUENTO),
                        bonificacion: String(row['BONIFICACION']).trim().toLowerCase() === 'true'
                    })),
                });
                
            });

            const finalData = { documentos: consolidatedData };

            // Actualiza la vista previa del JSON
            setJsonPreview(JSON.stringify(finalData, null, 4));
        };

        reader.readAsArrayBuffer(excelFile);
    };

    const saveJsonToFile = () => {
        if (!fileName.trim()) {
            alert('Por favor, ingresa un nombre para el archivo.');
            return;
        }

        const blob = new Blob([jsonPreview], { type: 'application/json' });
        saveAs(blob, `${fileName}.json`);
        alert('Archivo JSON guardado exitosamente.');
    };

    // Helper para agrupar por campos específicos
    const groupBy = (array, keys) => {
        return array.reduce((result, currentValue) => {
            const key = keys.map(k => currentValue[k]).join(',');
            (result[key] = result[key] || []).push(currentValue);
            return result;
        }, {});
    };

    return (
        <div style={styles.container}>
            <h1 style={styles.header}>Convertidor de Excel a JSON</h1>
            <div style={styles.card}>
                <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileUpload}
                    style={styles.inputFile}
                />
                <button onClick={processExcelToJson} style={styles.button}>
                    Procesar Excel
                </button>
            </div>
            <div style={styles.card}>
                <label style={styles.label}>Nombre del archivo:</label>
                <input
                    type="text"
                    value={fileName}
                    onChange={handleFileNameChange}
                    placeholder="Ejemplo: miArchivo"
                    style={styles.inputText}
                />
            </div>
            <h1 style={styles.header}>Previsualizador</h1>
            <div style={styles.card}>
                <textarea
                    value={jsonPreview}
                    readOnly
                    placeholder="Aquí se mostrará el JSON generado..."
                    style={styles.textarea}
                />
            </div>
            <button onClick={saveJsonToFile} style={styles.button} disabled={!jsonPreview}>
                Guardar JSON
            </button>
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
        fontFamily: 'Arial, sans-serif',
        maxWidth: '800px',
        margin: '0 auto',
    },
    header: {
        textAlign: 'center',
        color: '#333',
    },
    card: {
        marginBottom: '20px',
        padding: '15px',
        background: '#f9f9f9',
        borderRadius: '5px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    label: {
        display: 'block',
        marginBottom: '10px',
        fontSize: '16px',
    },
    inputFile: {
        width: '100%',
        padding: '10px',
        fontSize: '16px',
    },
    inputText: {
        width: '100%',
        padding: '10px',
        fontSize: '16px',
        border: '1px solid #ddd',
        borderRadius: '4px',
    },
    textarea: {
        width: '100%',
        height: '400px',
        padding: '10px',
        fontSize: '14px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        background: '#fff',
        fontFamily: 'monospace',
        resize: 'none',
    },
    button: {
        width: '100%',
        padding: '10px',
        background: '#007BFF',
        color: '#fff',
        fontSize: '16px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    buttonDisabled: {
        background: '#ccc',
    },
};

export default ExcelToJsonConverter;
