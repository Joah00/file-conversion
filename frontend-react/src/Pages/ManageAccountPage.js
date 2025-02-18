import React, { useState, useEffect } from "react";
import MainLayout from "../Layout/MainLayout";
import "./ManageAccountPage.css";
import {
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Autocomplete,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

function ManageAccountPage() {
  const columns = [
    { id: "username", label: "Username", minWidth: 170 },
    { id: "employeeID", label: "Employee ID", minWidth: 170 },
    { id: "status", label: "Status", minWidth: 100 },
    { id: "role", label: "Role", minWidth: 100 },
  ];
  const [employees, setEmployees] = useState([]);
  const [filter, setFilter] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [autoGeneratePassword, setAutoGeneratePassword] = React.useState(false);
  const roleMapping = {
    "ADMIN": 1,
    "EMPLOYEE": 2,
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/get_account_user_info",
          {
            headers: {
              Authorization: "Bearer " + localStorage.getItem("access_token"),
              "Content-Type": "application/json",
            },
          }
        );
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setEmployees(data); // Set the fetched data in the state
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter(
    (employee) =>
      employee.username.toLowerCase().includes(filter.toLowerCase()) ||
      (employee.employeeID &&
        employee.employeeID.toLowerCase().includes(filter.toLowerCase()))
  );

  const generateRandomPassword = () => {
    const characters =
      "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz@#$!~%^&*()";
    const passwordLength = 13;
    let password = "";

    for (let i = 0; i < passwordLength; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      password += characters[randomIndex];
    }

    return password;
  };

  const handleGeneratePassword = () => {
    const generatedPassword = generateRandomPassword();
    setSelectedEmployee((prev) => ({
      ...prev,
      password: generatedPassword,
    }));
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const handleRowClick = (employee) => {
    console.log("Selected Employee:", employee);
    setSelectedEmployee({
      username: employee.username || "",
      password: "",
      id: employee.ID || null,
      role: employee.role
    });
  };
  

  const handleInputChange = (prop) => (event) => {
    setSelectedEmployee({ ...selectedEmployee, [prop]: event.target.value });
  };

  const clearFields = () => {
    setSelectedEmployee({
      username: "",
      password: "",
      role: null, 
    });
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch(
        "http://127.0.0.1:5000/get_account_user_info",
        {
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
      console.error("Error fetching data:", error);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const handleCreateAccount = async () => {
    const { username, password, role } = selectedEmployee;
  
    if (!username || !password || !role) {
      alert("Username, password, and role are required.");
      return;
    }
  
    try {
      const authority = roleMapping[role];
  
      const response = await fetch("http://127.0.0.1:5000/create_account", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("access_token"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: 1,
          authority: authority, 
          username: username,
          password: password,
        }),
      });
  
      if (!response.ok) throw new Error("Failed to create account");
  
      alert("Account created successfully!");
      clearFields();
      fetchEmployees();
    } catch (error) {
      console.error("Error creating account:", error);
      alert("Error creating account: " + error.message);
    }
  };
  

  const handleUpdateAccount = async () => {
    const { username, password, id, role } = selectedEmployee;
  
    if (!username || !password || !id || !role) {
      alert("Username, password, role, and ID are required.");
      return;
    }
  
    try {
      const authority = roleMapping[role]; 
  
      const response = await fetch(`http://127.0.0.1:5000/update_account/${id}`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("access_token"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username,
          password: password,
          authority: authority, 
        }),
      });
  
      if (!response.ok) throw new Error("Failed to update account");
  
      alert("Account updated successfully!");
      clearFields();
      fetchEmployees();
    } catch (error) {
      console.error("Error updating account:", error);
      alert("Error updating account: " + error.message);
    }
  };

  const changeAccountStatus = async (newStatus) => {
    const { id } = selectedEmployee;

    if (!id) {
      alert("Please select from the table.");
      return;
    }

    try {
      const response = await fetch(
        `http://127.0.0.1:5000/change_account_status/${id}`,
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("access_token"),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: newStatus,
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to update account");

      alert("Account updated successfully!");
      clearFields();
      fetchEmployees();
    } catch (error) {
      console.error("Error updating account:", error);
      alert("Error updating account: " + error.message);
    }
  };

  return (
    <MainLayout>
      <div className="manage-account-container">
        <h2>Manage Accounts</h2>
        <TextField
          fullWidth
          label="Search by Employee ID"
          variant="filled"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          margin="normal"
          sx={{
            width: "100%",
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
                {filteredEmployees
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((employee) => (
                    <TableRow
                      hover
                      key={employee.id}
                      onClick={() => handleRowClick(employee)}
                      sx={{
                        "&:hover": { backgroundColor: "#1ab394" },
                        backgroundColor:
                          employee.id === selectedEmployee.id
                            ? "#293846"
                            : "inherit",
                      }}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column.id}
                          sx={{
                            color: "white",
                            borderColor: "#4c5b5b",
                          }}
                        >
                          {employee[column.id] ? employee[column.id] : "N/A"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={filteredEmployees.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{ color: "white" }}
          />
        </Paper>

        <div className="edit-space">
          <div className="credentials-container">
            <TextField
              label="Username"
              variant="filled"
              id="username"
              value={selectedEmployee.username || ""}
              onChange={handleInputChange("username")}
              margin="normal"
              sx={{
                width: "48%",
                mb: "0",
                "& .MuiInputBase-input": { color: "white" },
                "& .MuiInputLabel-root": { color: "#b5b5b5" },
                "& .MuiFilledInput-underline:after": {
                  borderBottomColor: "#1ab394",
                },
              }}
            />
            <TextField
              label="Password"
              variant="filled"
              id="password"
              type={selectedEmployee.showPassword ? "text" : "password"}
              value={selectedEmployee.password || ""}
              onChange={handleInputChange("password")}
              margin="normal"
              sx={{
                width: "48%",
                mb: "0",
                marginLeft: "4%",
                "& .MuiInputBase-input": { color: "white" },
                "& .MuiInputLabel-root": { color: "#b5b5b5" },
                "& .MuiFilledInput-underline:after": {
                  borderBottomColor: "#1ab394",
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={() =>
                        setSelectedEmployee({
                          ...selectedEmployee,
                          showPassword: !selectedEmployee.showPassword,
                        })
                      }
                      edge="end"
                    >
                      {selectedEmployee.showPassword ? (
                        <VisibilityOff />
                      ) : (
                        <Visibility />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </div>

          <div className="second-row">
            <Autocomplete
              options={["ADMIN", "EMPLOYEE"]}
              value={selectedEmployee.role || null}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Role"
                  variant="filled"
                  sx={{
                    width: "400%",
                    mb: "0",
                    marginRight: "4%", // To align with other input fields
                    "& .MuiInputBase-input": { color: "white" },
                    "& .MuiInputLabel-root": { color: "#b5b5b5" },
                    "& .MuiFilledInput-underline:after": {
                      borderBottomColor: "#1ab394",
                    },
                  }}
                />
              )}
              onChange={(event, newValue) => {
                setSelectedEmployee((prev) => ({
                  ...prev,
                  role: newValue,
                }));
              }}
            />
            <Button
              className="auto-generate-button"
              variant="contained"
              onClick={handleGeneratePassword} 
              sx={{
                backgroundColor: "#1ab394",
                "&:hover": { backgroundColor: "#18a383" },
                marginBottom: "10px",
              }}
            >
              Auto-generate Password
            </Button>
          </div>

          <div className="button-row">
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#18a383",
                "&:hover": { backgroundColor: "#1ab394" },
              }}
              onClick={handleCreateAccount}
            >
              Create New Account
            </Button>
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#1ab394",
                "&:hover": { backgroundColor: "#18a383" },
              }}
              onClick={handleUpdateAccount}
            >
              Overwrite Account
            </Button>

            <Button
              variant="contained"
              color="error"
              sx={{
                backgroundColor: "#d9534f !important",
                "&:hover": { backgroundColor: "#c9302c !important" },
                padding: "10px 20px",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginRight: "10px",
              }}
              onClick={() => changeAccountStatus(2)}
            >
              Deactivate Account
            </Button>

            <Button
              variant="contained"
              sx={{
                backgroundColor: "#1ab394",
                "&:hover": { backgroundColor: "#18a383" },
              }}
              onClick={() => changeAccountStatus(1)}
            >
              Activate Account
            </Button>

            <Button variant="contained" onClick={clearFields}>
              Clear
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

export default ManageAccountPage;
