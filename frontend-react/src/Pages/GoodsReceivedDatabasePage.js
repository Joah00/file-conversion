import React, { useState, useEffect } from "react";
import MainLayout from "../Layout/MainLayout";
import "./GoodsReceivedDatabasePage.css";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TablePagination from "@mui/material/TablePagination";
import { TextField } from "@mui/material";
import dayjs from "dayjs";

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
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [GRData, setGRData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [filterText, setFilterText] = useState("");
  const [filterGRText, setFilterGRText] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterDOID, setFilterDOID] = useState("");
  const [filterGRID, setFilterGRID] = useState("");

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

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
                {GRData.slice(
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
                            color: "white",
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
            count={GRData.length}
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

export default GoodsReceivedDatabasePage;
