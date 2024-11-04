import React, { useState, useEffect } from "react";
import MainLayout from "../Layout/MainLayout";
import "./DeliveryOrderDatabasePage.css";
import { TextField } from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/en-gb";
import DOGRTableComponent from "../Components/DOGRTableComponent"; 

dayjs.locale("en-gb");

function DeliveryOrderDatabasePage() {
  const columns = [
    { id: "uploadBy", label: "Uploaded By", minWidth: 170 },
    { id: "doid", label: "DO ID", minWidth: 80 },
    { id: "documentName", label: "Document Name", minWidth: 170 },
    { id: "uploadDate", label: "Upload Date", minWidth: 170 },
    { id: "status", label: "Status", minWidth: 80 },
  ];

  const [filterText, setFilterText] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDOID, setFilterDOID] = useState("");
  const [originalData, setOriginalData] = useState([]);
  const [displayData, setDisplayData] = useState([]);
  const [selectedID, setSelectedID] = useState(null);
  const [fileName, setFileName] = useState("");

  const handleFilterChange = (e) => {
    const newValue = e.target.value;
    setFilterText(newValue);
    updateFilteredData(newValue, filterDate, filterDOID);
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    setFilterDate(newDate);
    updateFilteredData(filterText, newDate, filterDOID);
  };

  const handleDOIDChange = (e) => {
    const newDOID = e.target.value;
    setFilterDOID(newDOID);
    updateFilteredData(filterText, filterDate, newDOID);
  };

  const updateFilteredData = (text, date, doid) => {
    const filteredData = originalData.filter((item) => {
      const matchesDocumentName = item.documentName
        .toLowerCase()
        .includes(text.toLowerCase());

      const matchesDate = date ? item.uploadDate === date : true;
      const matchesDOID = item.doid.toLowerCase().includes(doid.toLowerCase());

      return matchesDocumentName && matchesDate && matchesDOID;
    });

    setDisplayData(filteredData);
  };

  const handleRowClick = async (row) => {
    setSelectedID(row.ID);
    setFileName(row.documentName);
  
    try {
      const fileURL = await fetchFile(row.ID);
      if (fileURL) {
        window.open(fileURL, "_blank"); 
      }
    } catch (error) {
      console.error("Error opening file:", error);
    }
  };

  useEffect(() => {
    const fetchDOData = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/get_delivery_orders",
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
        setDisplayData(data);
      } catch (error) {
        console.error("Error fetching data:", error);
        setOriginalData([]);
        setDisplayData([]);
      }
    };
    fetchDOData();
  }, []);

  const fetchFile = async (id) => {
    try {
      const response = await fetch(
        `http://127.0.0.1:5000/get_delivery_order_file/${id}`,
        {
          headers: {
            Authorization: "Bearer " + localStorage.getItem("access_token"),
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch file");

      const blob = await response.blob();
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error("Error fetching file:", error);
      alert("Failed to fetch the file.");
    }
  };

  return (
    <MainLayout>
      <div className="DO-container">
        <h2>Delivery Order Database</h2>
        <div className="filter-container">
          <div
            style={{
              display: "flex",
              width: "100%",
              justifyContent: "space-between",
            }}
          >
            <TextField
              label="Filter by Document Name"
              variant="filled"
              value={filterText}
              onChange={handleFilterChange}
              margin="normal"
              sx={{
                width: "48%",
                mt: "0",
                mb: "",
                "& .MuiInputBase-input": { color: "white" },
                "& .MuiInputLabel-root": { color: "#b5b5b5" },
                "& .MuiFilledInput-underline:after": {
                  borderBottomColor: "#1ab394",
                },
              }}
            />
            <TextField
              label="Filter by Date (DD-MM-YYYY)"
              variant="filled"
              value={filterDate}
              onChange={handleDateChange}
              margin="normal"
              sx={{
                width: "48%",
                mt: "0",
                mb: "1%",
                "& .MuiInputBase-input": { color: "white" },
                "& .MuiInputLabel-root": { color: "#b5b5b5" },
                "& .MuiFilledInput-underline:after": {
                  borderBottomColor: "#1ab394",
                },
              }}
            />
          </div>
          <TextField
            fullWidth
            label="Filter by DO ID"
            variant="filled"
            value={filterDOID}
            onChange={handleDOIDChange}
            margin="normal"
            sx={{
              width: "100%",
              mt: "0",
              "& .MuiInputBase-input": { color: "white" },
              "& .MuiInputLabel-root": { color: "#b5b5b5" },
              "& .MuiFilledInput-underline:after": {
                borderBottomColor: "#1ab394",
              },
            }}
          />
        </div>
        <DOGRTableComponent
          columns={columns}
          data={displayData}
          onRowClick={handleRowClick}
          pagination={true}
          maxHeight={440}
          minHeight={0}
        />
      </div>
    </MainLayout>
  );
}

export default DeliveryOrderDatabasePage;
