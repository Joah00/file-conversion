import React, { useState } from 'react';
import MainLayout from '../Layout/MainLayout';
import './ConvertPage.css';
import CloseIcon from '@mui/icons-material/Close';
import {Button, theme} from '@mui/material/Button';

function ConvertPage() {
  const [uploadedFiles, setUploadedFiles] = useState([]);

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

  const handleDrop = (e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file =>
      file.type === 'image/png' || file.type === 'image/jpeg'
    );

    if (validFiles.length !== files.length) {
      alert('Only PNG and JPEG files are allowed.');
    }

    const duplicateFiles = validFiles.filter(file =>
      uploadedFiles.some(
        existingFile => existingFile.name === file.name && existingFile.size === file.size
      )
    );

    if (duplicateFiles.length > 0) {
      alert(`Duplicate files: ${duplicateFiles.map(file => file.name).join(', ')}`);
    }

    const newFiles = validFiles.filter(
      file => !uploadedFiles.some(
        existingFile => existingFile.name === file.name && existingFile.size === file.size
      )
    );

    setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file =>
      file.type === 'image/png' || file.type === 'image/jpeg'
    );

    if (validFiles.length !== files.length) {
      alert('Only PNG and JPEG files are allowed.');
    }

    const duplicateFiles = validFiles.filter(file =>
      uploadedFiles.some(
        existingFile => existingFile.name === file.name && existingFile.size === file.size
      )
    );

    if (duplicateFiles.length > 0) {
      alert(`Duplicate files detected: ${duplicateFiles.map(file => file.name).join(', ')}`);
    }

    const newFiles = validFiles.filter(
      file => !uploadedFiles.some(
        existingFile => existingFile.name === file.name && existingFile.size === file.size
      )
    );

    setUploadedFiles(prevFiles => [...prevFiles, ...newFiles]);
  };

  const handleChooseFilesClick = () => {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.click();
    }
  };

  const handleRemoveFile = (index) => {
    setUploadedFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleShowImage = (file) => {
    const fileURL = URL.createObjectURL(file);
    window.open(fileURL, '_blank');
  };

  const handleUpload = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload a file before submitting.');
      return;
    }

    try {
      const formData = new FormData();
      uploadedFiles.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });

      const response = await fetch('http://127.0.0.1:5000/upload_delivery_order', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + localStorage.getItem('access_token'),
        },
        body: formData,
      });

      if (response.ok) {
        alert('Files uploaded successfully!');
        setUploadedFiles([]); 
      } else {
        alert('Failed to upload files.');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files.');
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
          style={{ display: 'none' }}
          accept="image/png, image/jpeg"
          onChange={handleFileChange}
        />

        {uploadedFiles.length > 0 && (
          <div className="uploaded-files">
            <h3>Uploaded Files:</h3>
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
                      style={{ marginLeft: '10px' }}
                    >
                      Show Image
                    </Button>
                    <CloseIcon
                      className="remove-icon"
                      onClick={() => handleRemoveFile(index)}
                      style={{ cursor: 'pointer', marginLeft: '10px', color: 'red' }}
                    />
                  </li>
                ))}
              </ul>
            </div>
            <Button
              variant="contained"
              color="primary"
              onClick={handleUpload}
            >
              Convert
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default ConvertPage;
