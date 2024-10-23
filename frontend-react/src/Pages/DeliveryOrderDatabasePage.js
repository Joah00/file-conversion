import React, { useState, useEffect } from "react";
import MainLayout from "../Layout/MainLayout";
import "./DeliveryOrderDatabasePage.css";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import { TextField } from "@mui/material";
import dayjs from 'dayjs';
import 'dayjs/locale/en-gb';

dayjs.locale('en-gb');

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
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [originalData, setOriginalData] = useState([]); 
  const [displayData, setDisplayData] = useState([]); 

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

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
    const filteredData = originalData.filter(item => {
      const matchesDocumentName = item.documentName.toLowerCase().includes(text.toLowerCase());
      
      const matchesDate = date 
      ? item.uploadDate === date 
      : true;
      const matchesDOID = item.doid.toLowerCase().includes(doid.toLowerCase());
  
      return matchesDocumentName && matchesDate && matchesDOID;
    });
  
    setDisplayData(filteredData);
  };

  useEffect(() => {
    const fetchDOData = async () => {
      try {
        const response = await fetch('http://127.0.0.1:5000/get_delivery_orders', {
          headers: {
            Authorization: 'Bearer ' + localStorage.getItem('access_token'),
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setOriginalData(data);
        setDisplayData(data);  
      } catch (error) {
        console.error('Error fetching data:', error);
        setOriginalData([]);
        setDisplayData([]);
      }
    };
    fetchDOData();
  }, []);

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
                      align="center"
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
                {displayData.slice(
                  page * rowsPerPage,
                  page * rowsPerPage + rowsPerPage
                ).map((row, index) => (
                  <TableRow
                    hover
                    role="checkbox"
                    tabIndex={-1}
                    key={index}
                    sx={{ "&:hover": { backgroundColor: "#1ab394" } }}
                  >
                    {columns.map((column) => {
                      const value = row[column.id];
                      return (
                        <TableCell
                          key={column.id}
                          align="center"
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
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[10, 25]}
            component="div"
            count={displayData.length}
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
  if (columnId === "status") {
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

export default DeliveryOrderDatabasePage;
