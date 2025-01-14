import React, { useState, useEffect } from "react";
import MainLayout from "../Layout/MainLayout";
import "./GoodsReceivedDatabasePage.css";
import { TextField } from "@mui/material";
import DOGRTableComponent from "../Components/DOGRTableComponent";

function GoodsReceivedDatabasePage() {
  const columns = [
    { id: "convertedBy", label: "Converted By", minWidth: 170 },
    { id: "grid", label: "GR ID", minWidth: 80 },
    { id: "grDocumentName", label: "GR Document Name", minWidth: 170 },
    { id: "doid", label: "DO ID", minWidth: 80 },
    { id: "doDocumentName", label: "DO Document Name", minWidth: 170 },
    { id: "convertedDate", label: "Converted Date", minWidth: 170 },
  ];

  const [page, setPage] = useState(0);
  const [GRData, setGRData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [filterGRText, setFilterGRText] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDOID, setFilterDOID] = useState("");
  const [filterGRID, setFilterGRID] = useState("");


  const handleFilterChange = (e) => {
    const newText = e.target.value;
    setFilterText(newText);
    updateFilteredData(newText, filterGRText, filterDate, filterDOID, filterGRID);
  };

  const handleGRFilterChange = (e) => {
    const newGRText = e.target.value;
    setFilterGRText(newGRText);
    updateFilteredData(filterText, newGRText, filterDate, filterDOID, filterGRID);
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value; 
    setFilterDate(newDate); 
    updateFilteredData(filterText, filterGRText, newDate, filterDOID, filterGRID);
  };
  
  const handleDOIDChange = (e) => {
    const newDOID = e.target.value;
    setFilterDOID(newDOID);
    updateFilteredData(filterText, filterGRText, filterDate, newDOID, filterGRID);
  };

  const handleGRIDChange = (e) => {
    const newGRID = e.target.value;
    setFilterGRID(newGRID);
    updateFilteredData(filterText, filterGRText, filterDate, filterDOID, newGRID);
  };

  const updateFilteredData = (text, grText, date, doid, grid) => {
    const filteredData = originalData.filter(item => {
      const documentName = item.doDocumentName ? item.doDocumentName.toLowerCase() : "";
      const grDocumentName = item.grDocumentName ? item.grDocumentName.toLowerCase() : "";
      const itemDOID = item.doid ? item.doid.toString().toLowerCase() : "";
      const itemGRID = item.grid ? item.grid.toString().toLowerCase() : "";
      
      const matchesDate = date 
      ? item.convertedDate === date 
      : true;
    
      const matchesDocumentName = documentName.includes(text.toLowerCase());
      const matchesGRDocumentName = grDocumentName.includes(grText.toLowerCase());
      const matchesDOID = itemDOID.includes(doid.toLowerCase());
      const matchesGRID = itemGRID.includes(grid.toLowerCase());
  
      return matchesDocumentName && matchesGRDocumentName && matchesDate && matchesDOID && matchesGRID;
    });
  
    setGRData(filteredData);
    setPage(0);
  };
  
  
  useEffect(() => {
    const fetchGRData = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/get_goods_received_orders",
          {
            headers: {
              Authorization: "Bearer " + localStorage.getItem("access_token"),
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setOriginalData(data);
        setGRData(data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setOriginalData([]);
        setGRData([]);
      }
    };
    fetchGRData();
  }, []);

  const handleRowClick = async (row) => {
    console.log("Row clicked", row);
  
    // Fetch the GR file 
    const fetchGRFile = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:5000/get_goods_received_order_file/${row.grid}`,
          {
            headers: {
              Authorization: "Bearer " + localStorage.getItem("access_token"),
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch GR file");

        const fileExtension = row.grDocumentName?.split(".").pop();
        let mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; // Default to xlsx
        
        if (fileExtension === "xlsx") {
          mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; // Excel file type
        } else {
          mimeType = "application/octet-stream"; // Fallback to binary stream for other types
        }

        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = row.grDocumentName || "goods_received_order.xlsx";
        link.click();  
      } catch (error) {
        console.error("Error fetching GR file:", error);
        alert("Failed to fetch the GR file.");
      }
    };
  
    // Fetch the DO file 
    const fetchDOFile = async () => {
      try {
        const response = await fetch(
          `http://127.0.0.1:5000/get_delivery_order_file/${row.doid}`,
          {
            headers: {
              Authorization: "Bearer " + localStorage.getItem("access_token"),
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch DO file");
        const blob = await response.blob();
        const fileURL = URL.createObjectURL(blob);
        window.open(fileURL, "_blank");  // Open DO file in a new tab
      } catch (error) {
        console.error("Error fetching DO file:", error);
        alert("Failed to fetch the DO file.");
      }
    };
  
    // Fetch both GR and DO files
    await fetchGRFile();
    await fetchDOFile();
  };
  

  return (
    <MainLayout>
      <div className="GR-container">
        <h2>Goods Received Database</h2>
        <div className="filter-container">
          <div className="filter-row">
            <TextField
              label="Filter by DO Document Name"
              variant="filled"
              value={filterText}
              onChange={handleFilterChange}
              sx={{
                width: "48%",
                "& .MuiInputBase-input": { color: "white" },
                "& .MuiInputLabel-root": { color: "#b5b5b5" },
                "& .MuiFilledInput-underline:after": {
                  borderBottomColor: "#1ab394",
                },
              }}
            />
            <TextField
              label="Filter by GR Document Name"
              variant="filled"
              value={filterGRText}
              onChange={handleGRFilterChange}
              sx={{
                width: "48%",
                marginLeft: "4%",
                "& .MuiInputBase-input": { color: "white" },
                "& .MuiInputLabel-root": { color: "#b5b5b5" },
                "& .MuiFilledInput-underline:after": {
                  borderBottomColor: "#1ab394",
                },
              }}
            />
          </div>
          <div className="filter-row">
            <TextField
              label="Filter by DO ID"
              variant="filled"
              value={filterDOID}
              onChange={handleDOIDChange}
              sx={{
                width: "48%",
                "& .MuiInputBase-input": { color: "white" },
                "& .MuiInputLabel-root": { color: "#b5b5b5" },
                "& .MuiFilledInput-underline:after": {
                  borderBottomColor: "#1ab394",
                },
              }}
            />
            <TextField
              label="Filter by GR ID"
              variant="filled"
              value={filterGRID}
              onChange={handleGRIDChange}
              sx={{
                width: "48%",
                marginLeft: "4%",
                "& .MuiInputBase-input": { color: "white" },
                "& .MuiInputLabel-root": { color: "#b5b5b5" },
                "& .MuiFilledInput-underline:after": {
                  borderBottomColor: "#1ab394",
                },
              }}
            />
          </div>
          <div className="filter-row">
            <TextField
              label="Filter by Date DD-MM-YYYY"
              variant="filled"
              value={filterDate}
              onChange={handleDateChange}
              sx={{
                width: "98%", // Span across two columns
                "& .MuiInputBase-input": { color: "white" },
                "& .MuiInputLabel-root": { color: "#b5b5b5" },
                "& .MuiFilledInput-underline:after": {
                  borderBottomColor: "#1ab394",
                },
              }}
            />
          </div>
        </div>
        <DOGRTableComponent
          columns={columns}
          data={GRData}
          onRowClick={handleRowClick}
          pagination={true}
          maxHeight={440}
          minHeight="0"
        />
      </div>
    </MainLayout>
  );
}

export default GoodsReceivedDatabasePage;
