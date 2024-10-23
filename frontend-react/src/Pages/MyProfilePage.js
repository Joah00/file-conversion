import React, { useState, useEffect } from "react";
import MainLayout from "../Layout/MainLayout";
import {
  TextField,
  Button,
  IconButton,
  InputAdornment,
  FormControl,
  InputLabel,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import FilledInput from "@mui/material/FilledInput";
import "./MyProfilePage.css";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1ab394",
    },
    background: {
      default: "#2f4050",
    },
    action: {
      active: "#b5b5b5",
    },
  },
  components: {
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: "#b5b5b5",
          "&.Mui-focused": {
            color: "#1ab394",
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& fieldset": {
            borderColor: "white",
          },
          "&:hover fieldset": {
            borderColor: "#1ab394",
          },
          "&.Mui-focused fieldset": {
            borderColor: "#1ab394",
          },
          "& .MuiInputBase-input": {
            color: "white",
          },
        },
      },
    },
  },
});

function MyProfilePage() {
  const [profile, setProfile] = useState({
    realName: "",
    employeeID: "",
    icNumber: "",
    email: "",
    phoneNumber: "",
    role: "",
    shownName: "",
    oldPassword: "",
    password: "",
    confirmPassword: "",
    authorityDescription: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Fetch user details from the API
  const fetchUserDetails = async () => {
    try {
      const response = await fetch("http://127.0.0.1:5000/get_user_details", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("access_token"),
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch user details");
      const data = await response.json();

      // Update the profile state with the fetched data
      setProfile({
        realName: data.name,
        employeeID: data.employeeID,
        icNumber: data.icNumber,
        email: data.email,
        phoneNumber: data.phoneNumber,
        role: data.authorityDescription,
        shownName: data.displayName,
        oldPassword: "",
        password: "",
        confirmPassword: ""
      });
    } catch (error) {
      console.error("Error fetching user details:", error);
      alert("Failed to fetch user details. Please try again.");
    }
  };

  useEffect(() => {
    fetchUserDetails(); // Fetch user details on component mount
  }, []);

  const togglePasswordVisibility = (field) => {
    if (field === "oldPassword") {
      setShowOldPassword(!showOldPassword);
    } else if (field === "password") {
      setShowPassword(!showPassword);
    } else {
      setShowConfirmPassword(!showConfirmPassword);
    }
  };

  const handleChange = (prop) => (event) => {
    setProfile({ ...profile, [prop]: event.target.value });
  };

  const handleSubmit = async (section) => {
    // Check if display name is filled
    if (!profile.shownName) {
      alert("Display name is required.");
      return;
    }
  
    // Call the API to update the display name
    try {
      const response = await fetch("http://127.0.0.1:5000/update_display_name", {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("access_token"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: profile.shownName,
        }),
      });
  
      // Check if the response is not OK
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update display name");
      }
  
      // Success message
      alert("Display name updated successfully!");
  
      // Optionally, you can refresh the user details or clear the form here
    } catch (error) {
      console.error("Error updating display name:", error);
      alert(`Failed to update display name: ${error.message}`);
    }
  };

  const handlePasswordSubmit = async () => {
    // Check if all password fields are filled
    if (!profile.oldPassword || !profile.password || !profile.confirmPassword) {
      alert("All password fields are required.");
      return;
    }

    // Check if new password and confirm password match
    if (profile.password !== profile.confirmPassword) {
      alert("New password and confirm password do not match.");
      return;
    }

    // Call the API to change the password
    try {
      const response = await fetch("http://127.0.0.1:5000/change_password", {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("access_token"),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          oldPassword: profile.oldPassword,
          newPassword: profile.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to change password");
      }

      alert("Password changed successfully!");
      // Clear password fields after successful update
      setProfile({ ...profile, oldPassword: "", password: "", confirmPassword: "" });
    } catch (error) {
      console.error("Error changing password:", error);
      alert(`Failed to change password: ${error.message}`);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <MainLayout>
        <div className="profile-container">
          <h2>My Profile</h2>
          <div className="profile-info">
            <p>
              <strong>Name:</strong> {profile.realName}
            </p>
            <p>
              <strong>Employee ID:</strong> {profile.employeeID}
            </p>
            <p>
              <strong>IC Number:</strong> {profile.icNumber}
            </p>
            <p>
              <strong>Email:</strong> {profile.email}
            </p>
            <p>
              <strong>Phone Number:</strong> {profile.phoneNumber}
            </p>
            <p>
              <strong>Role:</strong> {profile.role}
            </p>
          </div>
          <div className="form-container" style={{ display: 'flex', backgroundColor: '#35485d', padding: '20px', borderRadius: '10px' }}>
            <div className="left-column" style={{ flex: 1, marginRight: '10px' }}>
              <TextField
                fullWidth
                label="Display Name (Custom)"
                variant="filled"
                value={profile.shownName}
                onChange={handleChange("shownName")}
                margin="normal"
                sx={{
                  "& .MuiInputBase-input": { color: "white" },
                  "& .MuiInputLabel-root": { color: "#b5b5b5" },
                  "& .MuiFilledInput-underline:after": {
                    borderBottomColor: "#1ab394",
                  },
                }}
              />
              <Button
                type="button"
                variant="contained"
                color="primary"
                sx={{
                  mt: 2,
                  color: "white", 
                }}
                onClick={() => handleSubmit("Display Name")}
              >
                Save Display Name
              </Button>
            </div>
            <div className="right-column" style={{ flex: 1, marginLeft: '10px' }}>
              <FormControl fullWidth variant="filled" margin="normal">
                <InputLabel htmlFor="old-password">Old Password</InputLabel>
                <FilledInput
                  id="old-password"
                  type={showOldPassword ? "text" : "password"}
                  value={profile.oldPassword}
                  onChange={handleChange("oldPassword")}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle old password visibility"
                        onClick={() => togglePasswordVisibility("oldPassword")}
                        edge="end"
                      >
                        {showOldPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label="Old Password"
                  sx={{
                    "& .MuiInputBase-input": { color: "white" },
                    "& .MuiInputLabel-root": { color: "#b5b5b5" },
                    "& .MuiFilledInput-underline:after": {
                      borderBottomColor: "#1ab394",
                    },
                  }}
                />
              </FormControl>
              <FormControl fullWidth variant="filled" margin="normal">
                <InputLabel htmlFor="password">New Password</InputLabel>
                <FilledInput
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={profile.password}
                  onChange={handleChange("password")}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={() => togglePasswordVisibility("password")}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label="New Password"
                  sx={{
                    "& .MuiInputBase-input": { color: "white" },
                    "& .MuiInputLabel-root": { color: "#b5b5b5" },
                    "& .MuiFilledInput-underline:after": {
                      borderBottomColor: "#1ab394",
                    },
                  }}
                />
              </FormControl>
              <FormControl fullWidth variant="filled" margin="normal">
                <InputLabel htmlFor="confirm-password">
                  Confirm New Password
                </InputLabel>
                <FilledInput
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={profile.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  endAdornment={
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle confirm password visibility"
                        onClick={() =>
                          togglePasswordVisibility("confirmPassword")
                        }
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  }
                  label="Confirm Password"
                  sx={{
                    "& .MuiInputBase-input": { color: "white" },
                    "& .MuiInputLabel-root": { color: "#b5b5b5" },
                    "& .MuiFilledInput-underline:after": {
                      borderBottomColor: "#1ab394",
                    },
                  }}
                />
              </FormControl>
              <Button
                type="button"
                variant="contained"
                color="primary"
                sx={{
                  mt: 2,
                  color: "white",
                }}
                onClick={handlePasswordSubmit}
              >
                Save Passwords
              </Button>
            </div>
          </div>
        </div>
      </MainLayout>
    </ThemeProvider>
  );
}

export default MyProfilePage;
