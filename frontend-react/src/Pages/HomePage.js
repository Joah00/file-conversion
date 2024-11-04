import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "../Layout/MainLayout";
import "./HomePage.css";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
} from "@mui/material";
import DOGRTableComponent from "../Components/DOGRTableComponent";

function HomePage({ userRole }) {
  const [userName, setUserName] = useState("");
  const [totalConverted, setTotalConverted] = useState(0);
  const [totalUploaded, setTotalUploaded] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [recentConversions, setRecentConversions] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState(recentConversions);

  const navigate = useNavigate();
  const handleRowClick = () => {
    navigate("/historyPage");
  };

  useEffect(() => {
    const fetchData = async () => {
      const headers = {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("access_token"),
      };

      try {
        const [
          displayNameResponse,
          conversionsResponse,
          convertedCountResponse,
          uploadedCountResponse,
          failedCountResponse,
        ] = await Promise.all([
          fetch("http://127.0.0.1:5000/get_displayName", {
            method: "GET",
            headers,
          }),
          fetch("http://127.0.0.1:5000/get_recent_conversions", {
            method: "GET",
            headers,
          }),
          fetch("http://127.0.0.1:5000/count_converted", {
            method: "GET",
            headers,
          }),
          fetch("http://127.0.0.1:5000/count_uploaded", {
            method: "GET",
            headers,
          }),
          fetch("http://127.0.0.1:5000/count_failed", {
            method: "GET",
            headers,
          }),
        ]);

        const displayName = await displayNameResponse.json();
        const conversions = await conversionsResponse.json();
        const convertedCount = await convertedCountResponse.json();
        const uploadedCount = await uploadedCountResponse.json();
        const failedCount = await failedCountResponse.json();

        setUserName(displayName.displayName);
        setRecentConversions(conversions);
        setFilteredFiles(conversions);
        setTotalConverted(convertedCount.count);
        setTotalUploaded(uploadedCount.count);
        setTotalFailed(failedCount.count);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  return (
    <MainLayout>
      <div className="homepage-container">
        {/* Greeting */}
        <h1 className="greeting">Hi, {userName}!</h1>

        {/* Quick Access Stats */}
        <div className="quick-stats">
          <div className="stat-item">
            <h3>Total Converted</h3>
            <p>{totalConverted}</p>
          </div>
          <div className="stat-item">
            <h3>Uploaded DO</h3>
            <p>{totalUploaded}</p>
          </div>
          <div className="stat-item">
            <h3>Failed Conversions</h3>
            <p>{totalFailed}</p>
          </div>
        </div>

        {/* Recent Uploads/Conversions */}
        <h2>Recent Conversions</h2>
        
          <DOGRTableComponent
            columns={[
              { id: "documentName", label: "Document Name" },
              { id: "conversionDate", label: "Conversion Date" },
              { id: "status", label: "Status" },
            ]}
            data={filteredFiles}
            onRowClick={() => navigate("/historyPage")}
            maxHeight="300px"
          />
        
      </div>
    </MainLayout>
  );
}

export default HomePage;
