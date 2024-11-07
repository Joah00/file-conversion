import React, { useState, useEffect } from "react";
import MainLayout from "../Layout/MainLayout";
import "./ConvertPage.css";
import CloseIcon from "@mui/icons-material/Close";
import { Button, Autocomplete, TextField } from "@mui/material";

function ConvertPage() {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);

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

  const handleMappingToTemplate = async (structuredData) => {
    try {
      const response = await fetch("http://127.0.0.1:5000/map_to_template", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("access_token"),
        },
        body: JSON.stringify({
          template_id: selectedTemplateId,
          structured_data: structuredData,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        alert(data.message || "Template mapping completed successfully!");
        window.open(
          `http://127.0.0.1:5000/download/${data.document_filename}`,
          "_blank"
        );
      } else {
        alert(data.error || "Failed to map data to template.");
      }
    } catch (error) {
      console.error("Error mapping to template:", error);
      alert("Failed to map data to template.");
    }
  };

  const handleUpload = async () => {
    // Check if there are uploaded files
    if (uploadedFiles.length === 0) {
      alert("Please select a PDF file before uploading.");
      return;
    }

    const file = uploadedFiles[0]; // Access the first file directly from uploadedFiles
    if (!file.name.endsWith(".pdf")) {
      alert("Please upload a PDF file.");
      return;
    }

    try {
      // Prepare form data for the PDF file upload
      const formData = new FormData();
      formData.append("file", file);

      // Send the PDF to the /extract_text endpoint
      const response = await fetch("http://127.0.0.1:5000/extract_text", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + localStorage.getItem("access_token"),
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(errorData.error || "Failed to extract text from PDF.");
        return;
      }

      // Destructure extracted text and structured data from the response
      const { extracted_text, structured_data } = await response.json();
      console.log("Extracted Text:", extracted_text);
      console.log("Structured Data:", structured_data);

      // Optional: Verify structured_data contents
      if (
        !structured_data ||
        !structured_data.description ||
        !structured_data.unit_price
      ) {
        alert("Extracted data is incomplete or not in the expected format.");
        return;
      }

      // Map to template
      const mappingResponse = await fetch(
        "http://127.0.0.1:5000/map_to_template",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + localStorage.getItem("access_token"),
          },
          body: JSON.stringify({
            template_id: selectedTemplateId,
            structured_data: structured_data,
          }),
        }
      );

      if (!mappingResponse.ok) {
        const errorData = await mappingResponse.json();
        alert(errorData.error || "Failed to map data to template.");
        return;
      }

      // Handle the DOCX response
      const docxBlob = await mappingResponse.blob();
      const docxUrl = URL.createObjectURL(docxBlob);
      const link = document.createElement("a");
      link.href = docxUrl;
      link.download = "generated_document.docx";
      link.click();

      alert("Mapping completed and document generated successfully!");
    } catch (error) {
      console.error("Error during file processing:", error);
      alert("Failed to complete the upload and mapping process.");
    }
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
            <div className="file-list-container">
              <ul className="file-list">
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
            <Button variant="contained" color="primary" onClick={handleUpload}>
              Convert
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default ConvertPage;
