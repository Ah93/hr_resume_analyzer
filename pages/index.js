import { useState, useEffect } from "react";
import ResumeUploader from "../components/ResumeUploader";
import Results from "../components/Results";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

export default function Home() {
  const [resumeText, setResumeText] = useState("");
  const [jd, setJd] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    // Add custom CSS for animations and glassmorphism effects
    const style = document.createElement('style');
    style.textContent = `
      .glassmorphism {
        background: rgba(255, 255, 255, 0.25);
        backdrop-filter: blur(10px);
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
      }
      
      .gradient-bg {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        min-height: 100vh;
      }
      
      .pulse-animation {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
      
      .hover-lift {
        transition: all 0.3s ease;
      }
      
      .hover-lift:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.1);
      }
      
      .step-indicator {
        position: relative;
        display: flex;
        justify-content: center;
        align-items: center;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        font-weight: bold;
        transition: all 0.3s ease;
      }
      
      .step-indicator.active {
        background: linear-gradient(45deg, #007bff, #0056b3);
        color: white;
        transform: scale(1.1);
      }
      
      .step-indicator.completed {
        background: linear-gradient(45deg, #28a745, #20c997);
        color: white;
      }
      
      .step-indicator.pending {
        background: #e9ecef;
        color: #6c757d;
      }
      
      .floating-elements {
        position: absolute;
        width: 100%;
        height: 100%;
        overflow: hidden;
        z-index: 0;
      }
      
      .floating-elements::before,
      .floating-elements::after {
        content: '';
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        animation: float 6s ease-in-out infinite;
      }
      
      .floating-elements::before {
        width: 200px;
        height: 200px;
        top: 10%;
        left: 10%;
        animation-delay: 0s;
      }
      
      .floating-elements::after {
        width: 150px;
        height: 150px;
        bottom: 10%;
        right: 10%;
        animation-delay: 3s;
      }
      
      @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-20px); }
      }
      
      .status-badge {
        font-size: 0.8rem;
        padding: 0.3rem 0.8rem;
        border-radius: 15px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleAnalyze = async () => {
    if (!resumeText || resumeText.trim().length === 0) {
      alert("Please upload a resume first and ensure it contains text.");
      return;
    }

    setLoading(true);
    setAnalysis(null);
    setCurrentStep(3);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          resume: resumeText.trim(), 
          jd: jd.trim() 
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      if (data.error) {
        alert("Analysis failed: " + data.error);
        setCurrentStep(2);
      } else {
        setAnalysis(data);
        setCurrentStep(4);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      alert("An error occurred during analysis: " + err.message);
      setCurrentStep(2);
    } finally {
      setLoading(false);
    }
  };

  const getStepClass = (step) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'active';
    return 'pending';
  };

  return (
    <div className="gradient-bg position-relative">
      <div className="floating-elements"></div>
      
      <div className="container-fluid py-5 position-relative" style={{ zIndex: 1 }}>
        <div className="row justify-content-center">
          <div className="col-12 col-xl-10">
            
            {/* Header Section */}
            <div className="text-center mb-5">
              <div className="glassmorphism p-4 mx-auto" style={{ maxWidth: '600px' }}>
                <h1 className="display-4 fw-bold text-white mb-3">
                  <i className="bi bi-person-check-fill me-3"></i>
                  HR Resume Analyzer
                </h1>
                <p className="lead text-white-50 mb-0">
                  AI-Powered Candidate Assessment & Skills Analysis Platform
                </p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="row mb-5">
              <div className="col-12">
                <div className="glassmorphism p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <div className={`step-indicator ${getStepClass(1)}`}>1</div>
                      <span className="ms-3 text-white fw-semibold">Upload Resume</span>
                    </div>
                    <div className="flex-grow-1 mx-3">
                      <div className="progress" style={{ height: '4px' }}>
                        <div className="progress-bar bg-info" style={{ width: currentStep >= 2 ? '100%' : '0%' }}></div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className={`step-indicator ${getStepClass(2)}`}>2</div>
                      <span className="ms-3 text-white fw-semibold">Add Job Description</span>
                    </div>
                    <div className="flex-grow-1 mx-3">
                      <div className="progress" style={{ height: '4px' }}>
                        <div className="progress-bar bg-info" style={{ width: currentStep >= 3 ? '100%' : '0%' }}></div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className={`step-indicator ${getStepClass(3)}`}>3</div>
                      <span className="ms-3 text-white fw-semibold">AI Analysis</span>
                    </div>
                    <div className="flex-grow-1 mx-3">
                      <div className="progress" style={{ height: '4px' }}>
                        <div className="progress-bar bg-info" style={{ width: currentStep >= 4 ? '100%' : '0%' }}></div>
                      </div>
                    </div>
                    <div className="d-flex align-items-center">
                      <div className={`step-indicator ${getStepClass(4)}`}>4</div>
                      <span className="ms-3 text-white fw-semibold">Results</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Upload Section */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="glassmorphism p-5 hover-lift">
                  <div className="row">
                    <div className="col-md-8 mx-auto">
                      <h3 className="text-white mb-4 text-center">
                        <i className="bi bi-cloud-upload-fill me-2"></i>
                        Upload Candidate Resume
                      </h3>
                      <ResumeUploader 
                        setResumeText={setResumeText} 
                        jd={jd} 
                        setJd={setJd}
                        setCurrentStep={setCurrentStep}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Dashboard */}
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="glassmorphism p-4 h-100 hover-lift">
                  <h5 className="text-white mb-3">
                    <i className="bi bi-file-earmark-text-fill me-2"></i>
                    Resume Status
                  </h5>
                  <div className="d-flex align-items-center">
                    <span className={`status-badge ${resumeText ? 'bg-success' : 'bg-warning'}`}>
                      {resumeText ? '✅ Ready' : '⏳ Pending'}
                    </span>
                    <span className="text-white-50 ms-3">
                      {resumeText ? `${Math.round(resumeText.length / 100)} chars` : 'No file uploaded'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="glassmorphism p-4 h-100 hover-lift">
                  <h5 className="text-white mb-3">
                    <i className="bi bi-briefcase-fill me-2"></i>
                    Job Description
                  </h5>
                  <div className="d-flex align-items-center">
                    <span className={`status-badge ${jd.trim() ? 'bg-success' : 'bg-secondary'}`}>
                      {jd.trim() ? '✅ Added' : '⚪ Optional'}
                    </span>
                    <span className="text-white-50 ms-3">
                      {jd.trim() ? `${Math.round(jd.length / 10)} words` : 'General analysis mode'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Analyze Button */}
            <div className="text-center mb-5">
              <button
                onClick={handleAnalyze}
                disabled={loading || !resumeText}
                className={`btn btn-lg px-5 py-3 fw-bold text-uppercase tracking-wide position-relative ${
                  loading || !resumeText
                    ? "btn-secondary"
                    : "btn-primary pulse-animation"
                }`}
                style={{ 
                  borderRadius: '50px',
                  background: loading || !resumeText ? undefined : 'linear-gradient(45deg, #007bff, #0056b3)',
                  border: 'none',
                  letterSpacing: '1px'
                }}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Analyzing Resume...
                  </>
                ) : (
                  <>
                    <i className="bi bi-cpu-fill me-2"></i>
                    Start AI Analysis
                  </>
                )}
              </button>
            </div>

            {/* Loading Animation */}
            {loading && (
              <div className="row mb-4">
                <div className="col-12">
                  <div className="glassmorphism p-5 text-center">
                    <div className="mb-4">
                      <div className="spinner-border text-info" style={{ width: '3rem', height: '3rem' }}></div>
                    </div>
                    <h4 className="text-white mb-3">AI Analysis in Progress</h4>
                    <div className="progress mb-3" style={{ height: '8px' }}>
                      <div className="progress-bar progress-bar-striped progress-bar-animated bg-info" style={{ width: '100%' }}></div>
                    </div>
                    <p className="text-white-50 mb-0">
                      <i className="bi bi-gear-fill me-2"></i>
                      Processing resume content, extracting skills, and generating insights...
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Results Section */}
            {analysis && (
              <div className="row">
                <div className="col-12">
                  <Results data={analysis} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}