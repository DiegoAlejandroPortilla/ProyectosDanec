import React, { useState } from "react";
import * as XLSX from "xlsx";
import { database, ref, push } from "./firebaseConfig";

const ExcelUploader = () => {
  const [file, setFile] = useState(null);
  const [excelData, setExcelData] = useState({});

  // Columnas que deben ser convertidas a porcentaje
  const percentageColumns = [
    "Porcentaje de Cumplimiento de Ruta al medio día",
    "Porcentaje de Cumplimiento de Ruta",
    "Efectividad de Ventas",
    "Efectividad de Visitas"
  ];

  // Columnas que deben ser convertidas a hora
  const timeColumns = [
    "Hora Incio/Primer Registro Visita",
    "Hora Fin/Ultimo Registro Visita"
  ];

  // Columnas que deben ser convertidas a duración (horas trabajadas)
  const durationColumns = ["HORAS TRABAJADAS"];

  // Columnas que deben ser convertidas a dólares
  const dollarColumns = [
    "Avance de Ventas Totales",
    "Ticket Promedio"
  ];

  // Columnas que deben ser convertidas a fecha
  const dateColumns = ["Fecha"];

  // 🔹 Función para limpiar nombres de claves inválidas en Firebase
  const sanitizeKey = (key) => {
    return key.replace(/[.#$/\[\]]/g, "_"); // Reemplaza caracteres inválidos por "_"
  };

  // 🔹 Función para limpiar y convertir valores correctamente
  const formatValue = (key, value) => {
    if (value === undefined || value === null) return value;

    // Convertir porcentaje
    if (percentageColumns.includes(key) && typeof value === "string" && value.includes("%")) {
      return value;
    }
    if (percentageColumns.includes(key) && !isNaN(value)) {
      return `${(parseFloat(value) * 100).toFixed(2)}%`;
    }

    // Convertir hora desde formato decimal (Excel almacena las horas como fracciones de día)
    if (timeColumns.includes(key) && !isNaN(value)) {
      let totalSeconds = Math.round(parseFloat(value) * 24 * 3600);
      let hours = Math.floor(totalSeconds / 3600);
      let minutes = Math.floor((totalSeconds % 3600) / 60);
      let seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    // Convertir duración (horas trabajadas) de decimal a HH:mm:ss
    if (durationColumns.includes(key) && !isNaN(value)) {
      let totalSeconds = Math.round(parseFloat(value) * 24 * 3600);
      let hours = Math.floor(totalSeconds / 3600);
      let minutes = Math.floor((totalSeconds % 3600) / 60);
      let seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }

    // 🔹 CORRECCIÓN: Redondear valores en dólares antes de formatear y mostrar
    if (dollarColumns.includes(key)) {
      let cleanValue = typeof value === "string" ? value.replace("$", "").trim() : value;
      let roundedValue = parseFloat(cleanValue);
      if (!isNaN(roundedValue)) {
        return `${roundedValue.toFixed(2)}`;
      }
    }

    // Convertir fecha a formato YYYY-MM-DD
    if (dateColumns.includes(key) && !isNaN(value)) {
      let date = new Date((value - 25569) * 86400 * 1000); // Convierte número de Excel a fecha
      return date.toISOString().split("T")[0];
    }

    return value;
  };

  // 🔹 Función para manejar la selección del archivo
  const handleFileUpload = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    const reader = new FileReader();
    reader.readAsBinaryString(selectedFile);
    
    reader.onload = (event) => {
      const binaryString = event.target.result;
      const workbook = XLSX.read(binaryString, { type: "binary" });

      let previewData = {};
      workbook.SheetNames.forEach(sheetName => {
        let sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        if (sheetData.length > 1) {
          const headers = sheetData[1]; // Usar la segunda fila como encabezados
          const formattedData = sheetData.slice(2).map(row => {
            let obj = {};
            headers.forEach((key, index) => {
              if (key) {
                let sanitizedKey = sanitizeKey(key); // Normaliza la clave
                obj[sanitizedKey] = formatValue(key, row[index]);
              }
            });
            return obj;
          });

          previewData[sanitizeKey(sheetName)] = formattedData; // Normalizar también los nombres de las hojas
        }
      });

      setExcelData(previewData);
    };
  };

  // 🔹 Función para subir los datos a Firebase
  const handleUploadToFirebase = async () => {
    if (!file) {
      alert("Por favor, selecciona un archivo Excel.");
      return;
    }

    for (const sheetName in excelData) {
      for (const row of excelData[sheetName]) {
        try {
          await push(ref(database, sheetName), row);
        } catch (error) {
          console.error(`Error subiendo datos a la colección ${sheetName}:`, error);
        }
      }
    }

    alert("Datos subidos exitosamente a Firebase Realtime Database.");
    setExcelData({});
    setFile(null);
  };

  return (
    <div>
      <h2>Subir Archivo Excel a Firebase</h2>
      <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} />
      
      {/* Mostrar Vista Previa */}
      {Object.keys(excelData).length > 0 && (
        <div>
          <h3>Previsualización de Datos</h3>
          {Object.entries(excelData).map(([sheetName, data], index) => (
            <div key={index}>
              <h4>📂 {sheetName}</h4>
              <table border="1" cellPadding="5" style={{ width: "100%", marginBottom: "20px" }}>
                <thead>
                  <tr>
                    {Object.keys(data[0]).map((key, i) => (
                      <th key={i}>{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 5).map((row, i) => (
                    <tr key={i}>
                      {Object.values(row).map((value, j) => (
                        <td key={j}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <button onClick={handleUploadToFirebase} style={{ padding: "10px", backgroundColor: "green", color: "white", border: "none", cursor: "pointer" }}>
            Confirmar y Subir a Firebase
          </button>
        </div>
      )}
    </div>
  );
};

export default ExcelUploader;
