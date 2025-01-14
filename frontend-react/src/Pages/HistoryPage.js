import React, { useState, useEffect } from "react";
import MainLayout from "../Layout/MainLayout";
import "./HistoryPage.css";
import DOGRTableComponent from "../Components/DOGRTableComponent";

function HistoryPage() {
  const columns = [
    { id: "DOID", label: "DO ID", minWidth: 70 },
    { id: "DO_document_Name", label: "DO Document Name", minWidth: 120 },
    { id: "Uploaded_Date", label: "Uploaded Date", minWidth: 120 },
    { id: "GRID", label: "GR ID", minWidth: 70 },
    { id: "GR_document_Name", label: "GR Document Name", minWidth: 120 },
    { id: "dateConverted", label: "Conversion Date", minWidth: 100 },
    { id: "status", label: "Status", minWidth: 50 },
  ];

  const [historyData, setHistoryData] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [filterDate, setFilterDate] = useState("");

  // Fetch history data from the API
  const fetchHistoryData = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/get_history", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("access_token"),
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch history data");
      const data = await response.json();
      setHistoryData(data);
    } catch (error) {
      console.error("Error fetching history data:", error);
      alert("Failed to fetch history data. Please try again.");
    }
  };

  useEffect(() => {
    fetchHistoryData(); 
  }, []);

  const filteredData = historyData.filter(
    (item) =>
      item.DO_document_Name &&
      item.DO_document_Name.toLowerCase().includes(filterText) &&
      (filterDate
        ? new Date(item.dateConverted?.split("-").reverse().join("-")) >=
          new Date(filterDate.split("-").reverse().join("-"))
        : true)
  );

  return (
    <MainLayout>
      <div className="history-container">
        <h2>Conversion History</h2>
        <DOGRTableComponent
          columns={columns}
          data={filteredData}
          pagination={true}
          maxHeight={440}
          minHeight={300}
        />
      </div>
    </MainLayout>
  );
}

function getColor(columnId, value) {
  if (columnId === "desc") {
    switch (value.toLowerCase()) {
      case "converted":
        return "#1ab394";
      case "new":
        return "#f0ad4e";
      case "failed":
        return "#d9534f";
      default:
        return "white";
    }
  }
  return "white";
}

export default HistoryPage;
