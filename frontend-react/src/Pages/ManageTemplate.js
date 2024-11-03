import React, { useState } from "react";
import MainLayout from "../Layout/MainLayout";
import { Button, TextField } from "@mui/material";
import "./ManageTemplate.css";
import CloseIcon from "@mui/icons-material/Close";

function ManageTemplate() {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [description, setDescription] = useState("");

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (
      file &&
      (file.type === "application/msword" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ) {
      setUploadedFile(file);
    } else {
      alert("Only DOC and DOCX files are allowed.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (
      file &&
      (file.type === "application/msword" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ) {
      setUploadedFile(file);
    } else {
      alert("Only DOC and DOCX files are allowed.");
    }
  };

  const handleChooseFileClick = () => {
    const fileInput = document.getElementById("file-input");
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleUpload = async () => {
    if (!uploadedFile) {
      alert("Please upload a DOC or DOCX file.");
      return;
    }
    if (!description) {
      alert("Please provide a description.");
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append("file", uploadedFile); 
      formData.append("description", description); 
  
      const response = await fetch("http://127.0.0.1:5000/upload_gr_template", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("access_token"),
        },
        body: formData,
      });
  
      const data = await response.json();
      if (response.ok) {
        alert(data.message || "Template uploaded successfully!");
        setUploadedFile(null); 
        setDescription("");
      } else {
        alert(data.error || "Failed to upload template.");
      }
    } catch (error) {
      console.error("Error uploading template:", error);
      alert("Failed to upload template.");
    }
  };

  return (
    <MainLayout>
      <div className="manage-template-container">
        <h2>Manage Template</h2>

        <TextField
          label="Template Description"
          variant="filled"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          fullWidth
          margin="normal"
          sx={{
            width: "100%",
            "& .MuiInputBase-input": { color: "white" },
            "& .MuiInputLabel-root": { color: "#b5b5b5" },
          }}
        />

        <div
          className="dropzone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <p>Drag and drop your DOC/DOCX file here</p>
          <p>or</p>
          <Button
            onClick={handleChooseFileClick}
            variant="contained"
            color="primary"
            sx={{
              mt: 2,
              color: "white",
            }}
          >
            CHOOSE FILE
          </Button>
        </div>

        <input
          type="file"
          id="file-input"
          style={{ display: "none" }}
          accept=".doc, .docx"
          onChange={handleFileChange}
        />

        {uploadedFile && (
          <div className="uploaded-file">
            <h3>Uploaded File:</h3>
            <div className="file-item">
              <p>{uploadedFile.name}</p>
              <Button
                variant="outlined"
                color="primary"
                size="small"
                onClick={() => {
                  const fileURL = URL.createObjectURL(uploadedFile);
                  window.open(fileURL, "_blank");
                }}
                style={{ marginLeft: "10px" }}
              >
                Show File
              </Button>
              <CloseIcon
                onClick={() => setUploadedFile(null)}
                style={{ cursor: "pointer", color: "red", marginLeft: "10px" }}
              />
            </div>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
              sx={{ mt: 2 }}
            >
              Upload Template
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default ManageTemplate;
