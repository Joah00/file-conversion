import React, { useState, useEffect } from "react";
import MainLayout from "../Layout/MainLayout";
import "./ManageInformationPage.css";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from "@mui/material";

function ManageInformationPage() {
  const [employees, setEmployees] = useState([]);
  const [newEmployees, setNewEmployees] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedEmployee, setSelectedEmployee] = useState({});
  const [filter, setFilter] = useState("");

  const columns = [
    { id: "employeeID", label: "EmployeeID", minWidth: 80 },
    { id: "name", label: "Name", minWidth: 180 },
    { id: "email", label: "Email", minWidth: 200 },
    { id: "phoneNumber", label: "Phone Number", minWidth: 70 },
    { id: "icNumber", label: "IC Number", minWidth: 60 },
    { id: "gender", label: "Gender", minWidth: 70 },
  ];

  const newEmployeesColumns = [
    { id: "username", label: "Username", minWidth: 90 },
  ];

  const fetchEmployees = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/get_employee_information",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("access_token"),
            "Content-Type": "application/json",
          },
        }
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setEmployees(data);
    } catch (error) {
      console.error("Error fetching employee information:", error);
    }
  };
  
  // Call fetchEmployees inside the useEffect to load the initial data
  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    const fetchNewEmployees = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/get_new_employee_username",
          {
            method: "GET",
            headers: {
              Authorization: "Bearer " + localStorage.getItem("access_token"),
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch new employees");
        const data = await response.json();
        setNewEmployees(data);
      } catch (error) {
        console.error("Error fetching new employees:", error);
      }
    };
    fetchNewEmployees();
  }, []);

  const handleRowClick = (employee) => {
    if (employee.ID) {
      setSelectedEmployee({
        username: employee.username,
        id: employee.ID,
        accountID: employee.ID, 
        displayName: employee.username, 
      });
    } else if (employee.Id) {
      setSelectedEmployee({
        ...employee,
        id: employee.Id,
        accountID: employee.accountID, 
        displayName: employee.name,
      });
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setSelectedEmployee((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setSelectedEmployee({});
  };

  const handleSubmit = (e) => {
    e.preventDefault();
  
    // Check if all required fields are filled, including accountID
    const requiredFields = ["employeeID", "name", "email", "phoneNumber", "icNumber", "gender", "accountID"];
    const missingFields = requiredFields.filter((field) => !selectedEmployee[field]);
  
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(", ")}`);
      return;
    }
  
    // Prepare data for submission
    const submissionData = {
      ...selectedEmployee,
      name: selectedEmployee.name.toUpperCase(),
      employeeID: selectedEmployee.employeeID.toUpperCase(),
      email: selectedEmployee.email.toLowerCase(),
      displayName: selectedEmployee.name.toUpperCase(), // Use the formatted name for displayName
    };
  
    // Submit data to the backend
    fetch("http://127.0.0.1:5000/create_user", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("access_token"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionData),
    })
      .then((response) => {
        if (!response.ok) {
          // Try to parse the error message from the response
          return response.json().then((errorData) => {
            throw new Error(errorData.error || "Failed to create user");
          });
        }
        return response.json();
      })
      .then((data) => {
        alert("User created successfully!");
        handleClear();
        fetchEmployees(); 
      })
      .catch((error) => {
        console.error("Error creating user:", error);
        alert(`Failed to create user: ${error.message}`);
      });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
  
    // Check if all required fields are filled
    const requiredFields = ["employeeID", "name", "email", "phoneNumber", "icNumber", "gender"];
    const missingFields = requiredFields.filter((field) => !selectedEmployee[field]);
  
    if (missingFields.length > 0) {
      alert(`Please fill in all required fields: ${missingFields.join(", ")}`);
      return;
    }
  
    // Prepare data for submission
    const submissionData = {
      employeeID: selectedEmployee.employeeID.toUpperCase(),
      name: selectedEmployee.name.toUpperCase(),
      email: selectedEmployee.email.toLowerCase(),
      phoneNumber: selectedEmployee.phoneNumber,
      icNumber: selectedEmployee.icNumber,
      gender: selectedEmployee.gender,
    };
  
    // Submit data to the backend
    fetch(`http://127.0.0.1:5000/update_user/${selectedEmployee.id}`, {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("access_token"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(submissionData),
    })
      .then((response) => {
        if (!response.ok) {
          // Try to parse the error message from the response
          return response.json().then((errorData) => {
            throw new Error(errorData.error || "Failed to update user");
          });
        }
        return response.json();
      })
      .then((data) => {
        alert("User updated successfully!");
        handleClear();
        fetchEmployees(); 
      })
      .catch((error) => {
        console.error("Error updating user:", error);
        alert(`Failed to update user: ${error.message}`);
      });
  };

  const filteredEmployees = employees.filter((employee) =>
    employee.employeeID.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="manage-information-container">
        <h2>Manage Employee Information</h2>
        <h3>Employees' Information Table</h3>
        <TextField
          fullWidth
          label="Search by Employee ID"
          variant="filled"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          margin="normal"
          sx={{
            width: "100%",
            mb: "8px",
            mt: "0",
            "& .MuiInputBase-input": { color: "white" },
            "& .MuiInputLabel-root": { color: "#b5b5b5" },
            "& .MuiFilledInput-underline:after": {
              borderBottomColor: "#1ab394",
            },
          }}
        />

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
                      sx={{
                        minWidth: column.minWidth,
                        background: "#1e3547",
                        color: "white",
                        borderColor: "white",
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredEmployees
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((employee) => (
                    <TableRow
                      hover
                      key={employee.Id}
                      onClick={() => handleRowClick(employee)}
                      selected={employee.Id === selectedEmployee.id}
                      sx={{
                        "&:hover": { backgroundColor: "#1ab394" },
                        backgroundColor:
                          employee.Id === selectedEmployee.id
                            ? "#135563"
                            : "inherit",
                        "& td": { borderColor: "#4c5b5b" },
                      }}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column.id}
                          sx={{ color: "white", borderColor: "#4c5b5b" }}
                        >
                          {employee[column.id]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10]}
            component="div"
            count={employees.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ color: "white" }}
          />
        </Paper>

        <br></br>
        <h3>New Employees Table</h3>
        <Paper
          sx={{
            width: "100%",
            overflow: "hidden",
            background: "#293846",
            color: "white",
            marginTop: 2,
          }}
        >
          <TableContainer sx={{ maxHeight: 440 }}>
            <Table stickyHeader aria-label="sticky table">
              <TableHead>
                <TableRow>
                  {newEmployeesColumns.map((column) => (
                    <TableCell
                      key={column.id}
                      sx={{
                        background: "#1e3547",
                        color: "white",
                        borderColor: "white",
                      }}
                    >
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {newEmployees
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((newEmployee) => (
                    <TableRow
                      hover
                      key={newEmployee.id}
                      onClick={() => handleRowClick(newEmployee)}
                      selected={newEmployee.id === selectedEmployee.id}
                      sx={{
                        "&:hover": { backgroundColor: "#1ab394" },
                        backgroundColor:
                          newEmployee.id === selectedEmployee.id
                            ? "#135563"
                            : "inherit",
                        "& td": { borderColor: "#4c5b5b" },
                      }}
                    >
                      <TableCell
                        sx={{ color: "white", borderColor: "#4c5b5b" }}
                      >
                        {newEmployee.username}
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10]}
            component="div"
            count={newEmployees.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ color: "white" }}
          />
        </Paper>

        <form onSubmit={handleSubmit} className="edit-form">
          {selectedEmployee.username && (
            <p style={{ color: "white" }}>
              Selected username: {selectedEmployee.username}
            </p>
          )}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="EmployeeID"
                variant="filled"
                name="employeeID"
                value={selectedEmployee.employeeID || ""}
                onChange={handleInputChange}
                sx={{
                  "& .MuiInputBase-input": {
                    color: "white",
                    "&::placeholder": {
                      color: "rgba(255, 255, 255, 0.6)",
                      opacity: 1,
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#b5b5b5",
                    "&.Mui-focused": {
                      color: "#1ab394",
                    },
                  },
                  "& .MuiFilledInput-underline:after": {
                    borderBottomColor: "#1ab394",
                  },
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Name"
                variant="filled"
                name="name"
                value={selectedEmployee.name || ""}
                onChange={handleInputChange}
                sx={{
                  "& .MuiInputBase-input": {
                    color: "white",
                    "&::placeholder": {
                      color: "rgba(255, 255, 255, 0.6)",
                      opacity: 1,
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#b5b5b5",
                    "&.Mui-focused": {
                      color: "#1ab394",
                    },
                  },
                  "& .MuiFilledInput-underline:after": {
                    borderBottomColor: "#1ab394",
                  },
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Email"
                variant="filled"
                name="email"
                type="email"
                value={selectedEmployee.email || ""}
                onChange={handleInputChange}
                sx={{
                  "& .MuiInputBase-input": {
                    color: "white",
                    "&::placeholder": {
                      color: "rgba(255, 255, 255, 0.6)",
                      opacity: 1,
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#b5b5b5",
                    "&.Mui-focused": {
                      color: "#1ab394",
                    },
                  },
                  "& .MuiFilledInput-underline:after": {
                    borderBottomColor: "#1ab394",
                  },
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Phone Number"
                variant="filled"
                name="phoneNumber"
                value={selectedEmployee.phoneNumber || ""}
                onChange={handleInputChange}
                sx={{
                  "& .MuiInputBase-input": {
                    color: "white",
                    "&::placeholder": {
                      color: "rgba(255, 255, 255, 0.6)",
                      opacity: 1,
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#b5b5b5",
                    "&.Mui-focused": {
                      color: "#1ab394",
                    },
                  },
                  "& .MuiFilledInput-underline:after": {
                    borderBottomColor: "#1ab394",
                  },
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="IC Number"
                variant="filled"
                name="icNumber"
                value={selectedEmployee.icNumber || ""}
                onChange={handleInputChange}
                sx={{
                  mb: 0,
                  "& .MuiInputBase-input": {
                    color: "white",
                    "&::placeholder": {
                      color: "rgba(255, 255, 255, 0.6)",
                      opacity: 1,
                    },
                  },
                  "& .MuiInputLabel-root": {
                    color: "#b5b5b5",
                    "&.Mui-focused": {
                      color: "#1ab394",
                    },
                  },
                  "& .MuiFilledInput-underline:after": {
                    borderBottomColor: "#1ab394",
                  },
                }}
              />
            </Grid>

            <Grid item xs={6}>
              <FormControl fullWidth variant="filled">
                <InputLabel
                  sx={{
                    color: "#b5b5b5",
                    "&.Mui-focused": {
                      color: "#1ab394",
                    },
                  }}
                >
                  Gender
                </InputLabel>
                <Select
                  name="gender"
                  value={selectedEmployee.gender || ""}
                  onChange={handleInputChange}
                  sx={{
                    mb: 0,
                    "& .MuiSelect-filled": {
                      color: "white",
                    },
                    "& .MuiInputBase-input": {
                      color: "white",
                      "&::placeholder": {
                        color: "rgba(255, 255, 255, 0.6)",
                        opacity: 1,
                      },
                    },
                    "& .MuiFilledInput-underline:after": {
                      borderBottomColor: "#1ab394",
                    },
                  }}
                >
                  <MenuItem value="MALE">MALE</MenuItem>
                  <MenuItem value="FEMALE">FEMALE</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} className="button-row">
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  width: "100%",
                }}
              >
                <Button
                  type="submit"
                  variant="contained"
                  onClick={handleUpdate}
                  sx={{
                    mt: 0,
                    backgroundColor: "#1ab394",
                    "&:hover": { backgroundColor: "#18a383" },
                  }}
                >
                  Update Changes
                </Button>

                <Button
                  type="submit"
                  variant="contained"
                  onClick={handleSubmit}
                  sx={{
                    mt: 0,
                    backgroundColor: "#1ab394",
                    "&:hover": { backgroundColor: "#18a383" },
                  }}
                >
                  Create New User
                </Button>

                <Button
                  variant="contained"
                  onClick={handleClear}
                  sx={{
                    mt: 0,
                    backgroundColor: "#18a383",
                    "&:hover": { backgroundColor: "#1ab394" },
                    marginRight: "10px",
                  }}
                >
                  Clear
                </Button>
              </div>
            </Grid>
          </Grid>
        </form>
      </div>
    </MainLayout>
  );
}

export default ManageInformationPage;
