import React, { useState, useEffect } from "react";
import MainLayout from "../Layout/MainLayout";
import "./HistoryPage.css";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import { TextField } from "@mui/material";

function HistoryPage() {
  const columns = [
    { id: "DOID", label: "DO ID", minWidth: 70 },
    { id: "DO_document_Name", label: "DO Document Name", minWidth: 120 },
    { id: "Uploaded_Date", label: "Uploaded Date", minWidth: 120 },
    { id: "GRID", label: "GR ID", minWidth: 70 },
    { id: "GR_document_Name", label: "GR Document Name", minWidth: 120 },
    { id: "dateConverted", label: "Conversion Date", minWidth: 100 },
    { id: "desc", label: "Status", minWidth: 50 },
  ];

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
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
    fetchHistoryData(); // Fetch history data on component mount
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleFilterChange = (e) => {
    setFilterText(e.target.value.toLowerCase());
  };

  const handleDateChange = (e) => {
    setFilterDate(e.target.value);
  };

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
        <Paper
          sx={{
            width: "100%",
            overflow: "hidden",
            background: "#293846",
            color: "white",
          }}
        >
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader aria-label="sticky table">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      style={{
                        minWidth: column.minWidth,
                        color: "white",
                        background: "#1e3547",
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => {
                      return (
                        <TableRow
                          hover
                          role="checkbox"
                          tabIndex={-1}
                          key={row.doid}
                          sx={{ "&:hover": { backgroundColor: "#1ab394" } }}
                        >
                          {columns.map((column) => {
                            const value = row[column.id] ?? "-";
                            return (
                              <TableCell
                                key={column.id}
                                sx={{
                                  background: "#293846",
                                  color: getColor(column.id, value),
                                  borderColor: "#4c5b5b",
                                }}
                              >
                                {value}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} align="center">
                      No records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ color: "white" }}
          />
        </Paper>
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
