import React, { useState, useEffect } from "react";
import MainLayout from "../Layout/MainLayout";
import "./ConvertPage.css";
import CloseIcon from "@mui/icons-material/Close";
import { Button, Autocomplete, TextField, Typography, CircularProgress, Box } from "@mui/material";

function ConvertPage() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);  
  const [progress, setProgress] = useState(0);   
  const [isDone, setIsDone] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter((file) => file.type === "application/pdf");

    if (validFiles.length !== files.length) {
      alert("Only PDF files are allowed.");
    }

    const duplicateFiles = validFiles.filter((file) =>
      uploadedFiles.some(
        (existingFile) =>
          existingFile.name === file.name && existingFile.size === file.size
      )
    );

    if (duplicateFiles.length > 0) {
      alert(
        `Duplicate files: ${duplicateFiles.map((file) => file.name).join(", ")}`
      );
    }

    const newFiles = validFiles.filter(
      (file) =>
        !uploadedFiles.some(
          (existingFile) =>
            existingFile.name === file.name && existingFile.size === file.size
        )
    );

    setUploadedFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch(
          "http://127.0.0.1:5000/get_gr_templates_desc",
          {
            headers: {
              Authorization: "Bearer " + localStorage.getItem("access_token"),
            },
          }
        );
        const data = await response.json();
        setTemplates(data);
      } catch (error) {
        console.error("Error fetching templates:", error);
      }
    };
    fetchTemplates();
  }, []);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter((file) => file.type === "application/pdf");

    if (validFiles.length !== files.length) {
      alert("Only PDF files are allowed.");
    }

    const duplicateFiles = validFiles.filter((file) =>
      uploadedFiles.some(
        (existingFile) =>
          existingFile.name === file.name && existingFile.size === file.size
      )
    );

    if (duplicateFiles.length > 0) {
      alert(
        `Duplicate files detected: ${duplicateFiles
          .map((file) => file.name)
          .join(", ")}`
      );
    }

    const newFiles = validFiles.filter(
      (file) =>
        !uploadedFiles.some(
          (existingFile) =>
            existingFile.name === file.name && existingFile.size === file.size
        )
    );

    setUploadedFiles((prevFiles) => [...prevFiles, ...newFiles]);
  };

  const handleChooseFilesClick = () => {
    const fileInput = document.getElementById("pdfInput");
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const handleShowImage = (file) => {
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, "_blank");
  };

  const clearAll = () => {
    setUploadedFiles([]);  
    setIsDone(false);      
    setIsLoading(false);   
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      alert("Please select a PDF file before uploading.");
      return;
    }
  
    setIsLoading(true);
    setIsDone(false);
  
    for (const file of uploadedFiles) {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const uploadResponse = await fetch("http://127.0.0.1:5000/upload_delivery_order", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("access_token"),
          },
          body: formData, 
        });
      
        if (!uploadResponse.ok) {
          const uploadError = await uploadResponse.json();
          throw new Error(uploadError.error || "Failed to upload delivery order");
        }

        const latestDoResponse = await fetch("http://127.0.0.1:5000/get_latest_doid", {
          method: "GET",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("access_token"),
          },
        });

        if (!latestDoResponse.ok) {
          const latestDoError = await latestDoResponse.json();
          throw new Error(latestDoError.error || "Failed to retrieve the latest DO ID");
        }

        const { latest_doid } = await latestDoResponse.json();
        
        if (!latest_doid) {
          throw new Error("No valid DO ID returned.");
        }
        
        const response = await fetch("http://127.0.0.1:5000/extract_text", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("access_token"),
          },
          body: formData,
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Upload failed");
        }
  
        const { structured_data } = await response.json();
  
        // Map to template
        const mappingResponse = await fetch("http://127.0.0.1:5000/map_to_template", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("access_token"),
          },
          body: JSON.stringify({ template_id: selectedTemplateId, structured_data }),
        });
  
        if (!mappingResponse.ok) {
          const errorData = await mappingResponse.json();
          throw new Error(errorData.error || "Mapping failed");
        }
  
        const xlsxBlob = await mappingResponse.blob();
        const link = document.createElement("a");
        link.href = URL.createObjectURL(xlsxBlob);
        link.download = `converted_GR_${file.name.replace('.pdf', '.xlsx')}`;
        link.click();

        const updateStatusResponse = await fetch("http://127.0.0.1:5000/update_convert_status", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("access_token"),
          },
          body: JSON.stringify({ convert_status: 1, do_id: latest_doid }),
        });
        if (!updateStatusResponse.ok) {
          const updateStatusError = await updateStatusResponse.json();
          throw new Error(updateStatusError.error || "Failed to update convert status");
        } 

        const grOrderFormData = new FormData();
        grOrderFormData.append("file", xlsxBlob);
        grOrderFormData.append("deliverOrderId", latest_doid);
        grOrderFormData.append("templateFileId", selectedTemplateId); 
        grOrderFormData.append("documentName", `GR_${file.name.replace('.pdf', '.xlsx')}`);

        const grUploadResponse = await fetch("http://127.0.0.1:5000/upload_goods_received_order", {
          method: "POST",
          headers: {
            Authorization: "Bearer " + localStorage.getItem("access_token"),
          },
          body: grOrderFormData,
        });

        if (!grUploadResponse.ok) {
          const grError = await grUploadResponse.json();
          throw new Error(grError.error || "Failed to upload Goods Received Order");
        }
        setIsDone(true);
      } catch (error) {
        console.error("Error during processing:", error);
        alert(error.message);
        setIsLoading(false);
        return;
      }
    }
    setIsLoading(false); 
  };
  

  return (
    <MainLayout>
      <div className="convert-container">
        <h2>Upload Your Files</h2>

        <div
          className="dropzone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <p>Drag and drop your files here</p>
          <p>or</p>
          <Button
            onClick={handleChooseFilesClick}
            type="button"
            variant="contained"
            color="primary"
            sx={{
              mt: 2,
              color: "white",
            }}
          >
            CHOOSE FILES
          </Button>
        </div>

        <input
          type="file"
          id="pdfInput"
          multiple
          style={{ display: "none" }}
          accept="application/pdf"
          onChange={handleFileChange}
        />

        {uploadedFiles.length > 0 && (
          <div className="uploaded-files">
            <h3>Uploaded Files:</h3>
            <Autocomplete
              options={templates}
              getOptionLabel={(option) => option.description}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Templates"
                  variant="filled"
                  sx={{
                    width: "50%",
                    mb: "30px",
                    marginRight: "4%",
                    "& .MuiInputBase-input": { color: "white" },
                    "& .MuiInputLabel-root": { color: "#b5b5b5" },
                    "& .MuiFilledInput-underline:after": {
                      borderBottomColor: "#1ab394",
                    },
                  }}
                />
              )}
              onChange={(event, newValue) => {
                if (newValue) setSelectedTemplateId(newValue.ID);
              }}
            />
            <Button variant="contained" color="primary" onClick={handleUpload}>
              Convert
            </Button>
            <Button variant="contained" color="primary" onClick={clearAll}
            style={{ marginLeft: "10px", backgroundColor: "red" }}>
              Clear All
            </Button>
            <br/> <br/>
            
            <div className="file-list-container">
              {isLoading ? (
                  <Box sx={{ display: "flex", marginLeft: "" }}>
                    <CircularProgress color="inherit" />
                    <Typography
                      variant="caption"
                      sx={{
                        color: "white",
                        fontSize: "15px",
                        marginLeft: "10px",
                        margintBottom: "10px"
                      }}
                    >
                      Converting
                    </Typography>
                    <br/>
                  </Box>
                ) : isDone ? (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#8BC34A",
                      fontSize: "15px",
                    }}
                  >
                    Below DO(s) has converted to GR(s)!
                  </Typography>
                ) : null}

              <ul className="file-list">
                <br/>
                {uploadedFiles.map((file, index) => (
                  <li key={index} className="file-item">
                    {file.name}
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={() => handleShowImage(file)}
                      style={{ marginLeft: "10px" }}
                    >
                      View file
                    </Button>
                    <CloseIcon
                      className="remove-icon"
                      onClick={() => handleRemoveFile(index)}
                      style={{
                        cursor: "pointer",
                        marginLeft: "10px",
                        color: "red",
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default ConvertPage;
