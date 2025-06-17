import { useState } from "react";
import mammoth from "mammoth";

export default function ResumeUploader({ setResumeText, jd, setJd, setCurrentStep }) {
  const [fileName, setFileName] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Enhanced PDF extraction using PDF.js
  const extractTextFromPDF = async (file) => {
    try {
      console.log("Starting PDF processing with PDF.js...");
      
      if (!window.pdfjsLib) {
        await loadPDFJS();
      }
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      console.log(`PDF loaded. Number of pages: ${pdf.numPages}`);
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map(item => item.str)
            .join(' ');
          
          if (pageText.trim()) {
            fullText += pageText + '\n\n';
          }
          
          console.log(`Extracted text from page ${pageNum}: ${pageText.length} characters`);
        } catch (pageError) {
          console.warn(`Error extracting text from page ${pageNum}:`, pageError);
        }
      }
      
      fullText = fullText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      
      if (fullText.length < 50) {
        throw new Error("Could not extract sufficient text from PDF. The PDF might contain only images or use complex formatting that requires OCR.");
      }
      
      console.log(`Successfully extracted ${fullText.length} characters from PDF`);
      return fullText;
      
    } catch (error) {
      console.error("PDF extraction error:", error);
      console.log("Falling back to basic PDF extraction method...");
      return await extractTextFromPDFBasic(file);
    }
  };

  const loadPDFJS = () => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        console.log('PDF.js loaded successfully');
        resolve();
      };
      script.onerror = () => {
        console.error('Failed to load PDF.js');
        reject(new Error('Failed to load PDF.js library'));
      };
      
      document.head.appendChild(script);
    });
  };

  const extractTextFromPDFBasic = async (file) => {
    try {
      console.log("Using basic PDF extraction method...");
      
      const text = await file.text();
      if (text && text.trim().length > 50 && !text.includes('%PDF')) {
        console.log("PDF extracted as plain text");
        return text;
      }
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
          try {
            const typedarray = new Uint8Array(e.target.result);
            let text = '';
            
            for (let i = 0; i < typedarray.length - 1; i++) {
              const char = String.fromCharCode(typedarray[i]);
              if (/[a-zA-Z0-9\s\.\,\!\?\@\#\$\%\^\&\*\(\)\-\_\+\=]/.test(char)) {
                text += char;
              }
            }
            
            text = text
              .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/(.)\1{10,}/g, '$1')
              .trim();
            
            if (text.length < 50) {
              reject(new Error("Could not extract readable text from PDF using basic method. The PDF might contain only images, be password-protected, or use complex formatting. Please try converting it to DOCX or using a text-based PDF."));
            } else {
              console.log(`Extracted ${text.length} characters from PDF using basic method`);
              resolve(text);
            }
          } catch (error) {
            reject(new Error("Failed to process PDF content with basic method."));
          }
        };
        
        reader.onerror = () => reject(new Error("Failed to read PDF file."));
        reader.readAsArrayBuffer(file);
      });
      
    } catch (error) {
      console.error("Basic PDF extraction error:", error);
      throw new Error("PDF processing failed completely. This PDF might contain only images, be password-protected, or use very complex formatting. Please try converting it to DOCX format for better compatibility.");
    }
  };

  const extractTextFromDocx = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error("DOCX extraction error:", error);
      throw new Error("Failed to extract text from DOCX file.");
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = async (file) => {
    if (!file) {
      setFileName("");
      setUploadStatus("");
      setResumeText("");
      return;
    }

    const ext = file.name.split(".").pop().toLowerCase();
    let text = "";

    const timeout = setTimeout(() => {
      setIsProcessing(false);
      setUploadStatus("❌ Processing timeout");
      alert("File processing timed out. This might be due to a large or complex PDF. Please try converting to DOCX format for better compatibility.");
    }, 30000);

    try {
      setIsProcessing(true);
      setUploadStatus("Processing file...");
      setFileName(file.name);

      console.log("Processing file:", file.name, "Type:", ext, "Size:", (file.size / 1024 / 1024).toFixed(2) + " MB");

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        clearTimeout(timeout);
        alert("File too large. Maximum size: 10MB. Please try a smaller file.");
        setFileName("");
        setUploadStatus("❌ File too large");
        setIsProcessing(false);
        return;
      }

      if (ext === "pdf") {
        setUploadStatus("Processing PDF... This may take a moment ⏳");
        text = await extractTextFromPDF(file);
      } else if (ext === "docx") {
        setUploadStatus("Processing DOCX file...");
        text = await extractTextFromDocx(file);
      } else {
        clearTimeout(timeout);
        alert("Unsupported file type. Please upload a PDF or DOCX file.");
        setFileName("");
        setUploadStatus("");
        setIsProcessing(false);
        return;
      }

      clearTimeout(timeout);

      if (!text || text.trim().length === 0) {
        throw new Error("No text could be extracted from the file. The file might be empty or contain only images.");
      }

      if (text.trim().length < 50) {
        throw new Error("The extracted text is too short. Please ensure your resume contains readable text content.");
      }

      console.log("Extracted text length:", text.length);
      setResumeText(text.trim());
      setUploadStatus("✅ File processed successfully!");
      setCurrentStep(2);
      
    } catch (err) {
      clearTimeout(timeout);
      console.error("File processing error:", err);
      alert("Failed to extract resume text: " + err.message);
      setFileName("");
      setUploadStatus("❌ Failed to process file");
      setResumeText("");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        className={`border-3 border-dashed rounded-4 p-5 text-center position-relative transition-all ${
          dragActive ? 'border-info bg-info bg-opacity-10' : 'border-light bg-white bg-opacity-10'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{ minHeight: '200px' }}
      >
        <div className="d-flex flex-column align-items-center justify-content-center h-100">
          <i className={`bi bi-cloud-arrow-up display-1 mb-3 ${dragActive ? 'text-info' : 'text-white-50'}`}></i>
          <h5 className="text-white mb-3">
            {dragActive ? 'Drop your resume here!' : 'Upload Resume'}
          </h5>
          <p className="text-white-50 mb-4">
            Drag & drop your resume here, or click to browse
          </p>
          
          <input 
            type="file" 
            accept=".pdf,.docx" 
            onChange={handleFile} 
            className="d-none"
            id="fileInput"
            disabled={isProcessing}
          />
          <label 
            htmlFor="fileInput" 
            className={`btn btn-outline-light btn-lg px-4 py-2 ${isProcessing ? 'disabled' : ''}`}
            style={{ borderRadius: '25px' }}
          >
            <i className="bi bi-folder2-open me-2"></i>
            Choose File
          </label>
        </div>
      </div>

      {/* File Processing Status */}
      {isProcessing && (
        <div className="alert alert-info d-flex align-items-center" role="alert">
          <div className="spinner-border spinner-border-sm me-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <div>
            <strong>Processing your resume...</strong>
            <div className="small mt-1">
              {uploadStatus.includes('PDF') ? 'Using advanced PDF extraction engine' : 'Extracting content'}
            </div>
          </div>
        </div>
      )}

      {/* File Info */}
      {fileName && !isProcessing && (
        <div className="alert alert-success d-flex align-items-center" role="alert">
          <i className="bi bi-file-earmark-check-fill me-3 fs-4"></i>
          <div>
            <strong>File uploaded successfully!</strong>
            <div className="small mt-1">📄 {fileName}</div>
          </div>
        </div>
      )}

      {/* Upload Status */}
      {uploadStatus && !isProcessing && (
        <div className={`alert ${uploadStatus.includes('✅') ? 'alert-success' : 'alert-danger'} d-flex align-items-center`} role="alert">
          <i className={`bi ${uploadStatus.includes('✅') ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-3 fs-4`}></i>
          <div>
            <strong>{uploadStatus}</strong>
          </div>
        </div>
      )}

      {/* File Format Info */}
      <div className="row">
        <div className="col-md-6">
          <div className="card bg-light bg-opacity-10 border-0 h-100">
            <div className="card-body text-white">
              <h6 className="card-title">
                <i className="bi bi-info-circle-fill me-2"></i>
                Supported Formats
              </h6>
              <ul className="list-unstyled mb-0 small">
                <li><i className="bi bi-file-earmark-pdf-fill text-danger me-2"></i>PDF files (max 10MB)</li>
                <li><i className="bi bi-file-earmark-word-fill text-primary me-2"></i>DOCX files (max 10MB)</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card bg-light bg-opacity-10 border-0 h-100">
            <div className="card-body text-white">
              <h6 className="card-title">
                <i className="bi bi-lightbulb-fill me-2"></i>
                Pro Tips
              </h6>
              <ul className="list-unstyled mb-0 small">
                <li>• Text-based PDFs work best</li>
                <li>• DOCX format recommended</li>
                <li>• Avoid image-only documents</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Job Description Input */}
      <div className="mt-4">
        <label className="form-label text-white h5 mb-3">
          <i className="bi bi-briefcase-fill me-2"></i>
          Job Description (Optional but Recommended)
        </label>
        <div className="form-floating">
          <textarea
            className="form-control bg-white bg-opacity-10 border-light text-white"
            placeholder="Paste the job description here for more accurate matching..."
            id="jobDescription"
            style={{ minHeight: '150px', resize: 'vertical' }}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          <label htmlFor="jobDescription" className="text-white-50">
            Paste job requirements, skills, and qualifications...
          </label>
        </div>
        <div className="form-text text-white-50 mt-2">
          <i className="bi bi-star-fill text-warning me-1"></i>
          Adding a job description will provide more accurate matching scores and targeted recommendations.
        </div>
      </div>
    </div>
  );
}