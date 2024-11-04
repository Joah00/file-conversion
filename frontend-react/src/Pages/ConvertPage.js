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
    const fileInput = document.getElementById("file-input");
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

  // const handleUpload = async () => {
  //   if (uploadedFiles.length === 0) {
  //     alert("Please upload a PDF file before submitting.");
  //     return;
  //   }

  //   try {
  //     const formData = new FormData();
  //     uploadedFiles.forEach((file, index) => {
  //       formData.append("file", file);
  //     });

  //     // Step 1: Upload the file to the delivery order endpoint
  //     const dbResponse = await fetch(
  //       "http://127.0.0.1:5000/upload_delivery_order",
  //       {
  //         method: "POST",
  //         headers: {
  //           Authorization: "Bearer " + localStorage.getItem("access_token"),
  //         },
  //         body: formData,
  //       }
  //     );

  //     const dbData = await dbResponse.json();
  //     if (!dbResponse.ok) {
  //       alert(dbData.error || "Failed to upload file to database.");
  //       return;
  //     }

  //     alert("File uploaded successfully to the database.");

  //     // Step 2: Process the PDF content
  //     const pdfProcessingResponse = await fetch(
  //       "http://127.0.0.1:5000/process_pdf",
  //       {
  //         method: "POST",
  //         headers: {
  //           Authorization: "Bearer " + localStorage.getItem("access_token"),
  //         },
  //         body: formData,
  //       }
  //     );

  //     const pdfData = await pdfProcessingResponse.json();
  //     if (!pdfProcessingResponse.ok) {
  //       alert(pdfData.error || "Failed to process PDF.");
  //       return;
  //     }

  //     alert(pdfData.message);

  //     // Step 3: NLP Processing with OpenAI
  //     const nlpResponse = await fetch("http://127.0.0.1:5000/nlp_processing", {
  //       method: "POST",
  //       headers: {
  //         Authorization: "Bearer " + localStorage.getItem("access_token"),
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({ text: pdfData.extracted_text }),
  //     });

  //     const nlpData = await nlpResponse.json();
  //     if (!nlpResponse.ok) {
  //       alert(nlpData.error || "Failed NLP processing.");
  //       return;
  //     }

  //     // Step 5: Map to template using the returned structured data from NLP
  //     await handleMappingToTemplate(nlpData.structured_data);
  //     setUploadedFiles([]);

  //     // Step 6: Generate PDF and open it in a new tab
  //     const generatedPdfResponse = await fetch(
  //       "http://127.0.0.1:5000/generate_pdf",
  //       {
  //         method: "POST",
  //         headers: {
  //           Authorization: "Bearer " + localStorage.getItem("access_token"),
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({ mappedData: nlpData.structured_data }),
  //       }
  //     );

  //     if (!generatedPdfResponse.ok) {
  //       const errorData = await generatedPdfResponse.json();
  //       alert(errorData.error || "Failed to generate PDF.");
  //       return;
  //     }

  //     const pdfBlob = await generatedPdfResponse.blob();
  //     const pdfUrl = URL.createObjectURL(pdfBlob);
  //     window.open(pdfUrl, "_blank");
  //     setUploadedFiles([]);
  //   } catch (error) {
  //     console.error("Error during file processing:", error);
  //     alert("Failed to complete the upload and processing.");
  //   }
  // };

  const handleUpload = async () => {
    if (!selectedTemplateId) {
      alert("Please select a template before converting.");
      return;
    }

    try {
      // Hardcoded structured data for multiple prices
      const testStructuredData = {
        "Unit Price 1": ["34.23"],
        "Unit Price 2": ["45.67"],
        "Unit Price 3": ["29.99"],
        "Unit Price 4": ["39.00"],
        "Unit Price 5": ["55.50"],
      };

      // Call the mapping API directly with multiple prices
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
            structured_data: testStructuredData,
          }),
        }
      );

      if (!mappingResponse.ok) {
        const errorData = await mappingResponse.json();
        alert(errorData.error || "Failed to map data to template.");
        return;
      }

      // Handle the PDF response directly
      const pdfBlob = await mappingResponse.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, "_blank"); // Open generated PDF in a new tab
    } catch (error) {
      console.error("Error during file processing:", error);
      alert("Failed to complete the mapping and PDF generation.");
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
          id="file-input"
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
                      Show Image
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
