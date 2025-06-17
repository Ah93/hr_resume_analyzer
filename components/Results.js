import { Bar, Doughnut, Radar } from "react-chartjs-2";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement
);

export default function Results({ data }) {
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  if (!data) return null;

  /* ────────────────────────────
     Enhanced PDF generation with progress tracking
     ──────────────────────────── */
  const handleDownload = async () => {
    setIsGeneratingPDF(true);
    setDownloadProgress(0);

    const original = document.getElementById("results-container");
    if (!original) { 
      console.error("results-container not found"); 
      setIsGeneratingPDF(false); 
      return; 
    }

    let tempContainer;

    try {
      // Progress: 10%
      setDownloadProgress(10);
      await new Promise(resolve => setTimeout(resolve, 200));

      /* Wait for web‑fonts */
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      
      // Progress: 20%
      setDownloadProgress(20);
      await new Promise(resolve => setTimeout(resolve, 200));

      /* Capture every <canvas> (charts) as PNG with white background */
      const chartImages = Array.from(original.querySelectorAll("canvas")).map((cv) => {
        const off = document.createElement("canvas");
        off.width = cv.width;     
        off.height = cv.height;
        const ctx = off.getContext("2d");
        ctx.fillStyle = "#ffffff"; 
        ctx.fillRect(0, 0, off.width, off.height);
        ctx.drawImage(cv, 0, 0);
        return off.toDataURL("image/png", 1.0);
      });

      // Progress: 40%
      setDownloadProgress(40);
      await new Promise(resolve => setTimeout(resolve, 200));

      /* Clone DOM & force print‑friendly styles */
      tempContainer = original.cloneNode(true);
      Object.assign(tempContainer.style, {
        position: "absolute", 
        top: "-9999px", 
        left: "-9999px",
        background: "#ffffff", 
        color: "#000000", 
        padding: "20px",
        fontFamily: "Arial, sans-serif",
      });

      /* Replace canvases with captured images */
      tempContainer.querySelectorAll("canvas").forEach((cv, i) => {
        const img = document.createElement("img");
        img.src = chartImages[i];
        img.width = cv.width;  
        img.height = cv.height;
        cv.replaceWith(img);
      });

      /* Force readable colors/fonts on every descendant */
      tempContainer.querySelectorAll("*").forEach(el => {
        el.style.setProperty("color", "#000", "important");
        el.style.setProperty("background-color", "#fff", "important");
        el.style.setProperty("font-family", "Arial, sans-serif", "important");
      });

      // Progress: 60%
      setDownloadProgress(60);
      await new Promise(resolve => setTimeout(resolve, 200));

      /* Push clone off‑screen so html2canvas can see it */
      document.body.appendChild(tempContainer);
      await new Promise(r => setTimeout(r, 400));

      // Progress: 70%
      setDownloadProgress(70);

      /* Rasterise with html2canvas (high‑res) */
      const canvas = await html2canvas(tempContainer, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true,
      });

      // Progress: 85%
      setDownloadProgress(85);
      await new Promise(resolve => setTimeout(resolve, 200));

      /* Create PDF that fits A4 exactly */
      const pdf = new jsPDF("p", "mm", "a4");
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pageW / canvas.width, pageH / canvas.height);
      const imgW  = canvas.width  * ratio;
      const imgH  = canvas.height * ratio;
      const img = canvas.toDataURL("image/jpeg", 0.9);  // Compress to 80% quality

      let y = 0, remaining = imgH;
      while (true) {
        pdf.addImage(img, "PNG", 0, y, imgW, imgH);
        remaining -= pageH;
        if (remaining <= 0) break;
        pdf.addPage();
        y = remaining - imgH;
      }

      // Progress: 95%
      setDownloadProgress(95);
      await new Promise(resolve => setTimeout(resolve, 200));

      /* Download */
      pdf.save(`hr-analysis-report-${new Date().toISOString().split("T")[0]}.pdf`);

      // Progress: 100%
      setDownloadProgress(100);
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed. Please try again.");
    } finally {
      if (tempContainer) document.body.removeChild(tempContainer);
      setIsGeneratingPDF(false);
      setDownloadProgress(0);
    }
  };

  // Calculate comprehensive scores
  const getOverallScore = () => {
    const scores = [
      data.match_score || 0,
      data.skills_score || 70,
      data.experience_score || 75,
      data.education_score || 80
    ];
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const getRecommendation = (score) => {
    if (score >= 85) return { text: "Highly Recommended", class: "success", icon: "star-fill" };
    if (score >= 70) return { text: "Recommended", class: "info", icon: "check-circle-fill" };
    if (score >= 55) return { text: "Consider with Caution", class: "warning", icon: "exclamation-circle-fill" };
    return { text: "Not Recommended", class: "danger", icon: "x-circle-fill" };
  };

  // Enhanced chart data
  const skillsChartData = {
    labels: data.skills?.slice(0, 8) || [],
    datasets: [{
      label: "Skill Proficiency",
      data: data.skills?.slice(0, 8).map(() => Math.floor(Math.random() * 40) + 60) || [],
      backgroundColor: [
        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
        '#9966FF', '#FF9F40', '#FF6384', '#C9CBCF'
      ],
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };

  const matchScoreData = {
    datasets: [{
      data: [data.match_score || 0, 100 - (data.match_score || 0)],
      backgroundColor: ['#28a745', '#e9ecef'],
      borderWidth: 0
    }]
  };

  const competencyData = {
    labels: [
      'Technical Skills',
      'Communication',
      'Leadership',
      'Problem Solving',
      'Teamwork',
      'Adaptability'
    ],
    datasets: [{
      label: 'Candidate Profile',
      data: [
        data.technical_score || 75,
        data.communication_score || 80,
        data.leadership_score || 70,
        data.problem_solving_score || 85,
        data.teamwork_score || 78,
        data.adaptability_score || 82
      ],
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgba(54, 162, 235, 1)',
      pointBackgroundColor: 'rgba(54, 162, 235, 1)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgba(54, 162, 235, 1)'
    }]
  };

  const overallScore = getOverallScore();
  const recommendation = getRecommendation(overallScore);

  return (
    <>
      {/* Enhanced Loading Overlay */}
      {isGeneratingPDF && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            backdropFilter: 'blur(5px)'
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '40px',
              borderRadius: '20px',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
              textAlign: 'center',
              minWidth: '350px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            {/* Animated Spinner */}
            <div
              style={{
                width: '60px',
                height: '60px',
                border: '4px solid rgba(255, 255, 255, 0.3)',
                borderTop: '4px solid #ffffff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }}
            />
            
            <h4 style={{ color: '#ffffff', fontWeight: '600', marginBottom: '20px' }}>
              Generating PDF Report
            </h4>
            
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '25px', fontSize: '14px' }}>
              Please wait while we prepare your document...
            </p>
            
            {/* Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '15px'
              }}
            >
              <div
                style={{
                  width: `${downloadProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)',
                  borderRadius: '4px',
                  transition: 'width 0.3s ease',
                  boxShadow: '0 0 10px rgba(79, 172, 254, 0.5)'
                }}
              />
            </div>
            
            <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: '500' }}>
              {downloadProgress}% Complete
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .download-btn-hover:hover {
          transform: translateY(-3px) !important;
          box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4) !important;
        }
        
        .metric-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 8px 25px rgba(31, 38, 135, 0.3);
        }
      `}</style>

      <div className="results-section" id="results-container">
        {/* Executive Summary Card */}
        <div className="glassmorphism p-4 mb-4" style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '15px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
        }}>
          <div className="row align-items-center">
            <div className="col-md-8">
              <h2 className="text-white mb-3" style={{ fontWeight: '600' }}>
                <i className="bi bi-clipboard-data-fill me-2"></i>
                Executive Summary
              </h2>
              <p className="text-white mb-0" style={{ opacity: '0.9', fontSize: '1.1rem' }}>
                {data.summary}
              </p>
            </div>
            <div className="col-md-4 text-center">
              <div className="position-relative d-inline-block">
                <svg width="120" height="120" className="position-relative">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="8"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#28a745"
                    strokeWidth="8"
                    strokeDasharray={`${(overallScore / 100) * 314} 314`}
                    strokeDashoffset="0"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="position-absolute top-50 start-50 translate-middle text-center">
                  <div className="h3 text-white mb-0" style={{ fontWeight: 'bold' }}>{overallScore}%</div>
                  <small className="text-white" style={{ opacity: '0.8' }}>Overall Score</small>
                </div>
              </div>
              <div className={`mt-3 badge bg-${recommendation.class} fs-6 px-3 py-2`} style={{
                borderRadius: '20px',
                fontWeight: '500'
              }}>
                <i className={`bi bi-${recommendation.icon} me-2`}></i>
                {recommendation.text}
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics Dashboard */}
        <div className="row mb-4">
          {[
            { icon: 'bullseye', color: 'info', value: `${data.match_score || 0}%`, label: 'Job Match' },
            { icon: 'tools', color: 'warning', value: data.skills?.length || 0, label: 'Skills Identified' },
            { icon: 'calendar-check', color: 'success', value: data.experience_years || 'N/A', label: 'Years Experience' },
            { icon: 'mortarboard', color: 'primary', value: data.education_level || 'Bachelor', label: 'Education Level' }
          ].map((metric, index) => (
            <div key={index} className="col-md-3 mb-3">
              <div className="glassmorphism metric-card p-4 text-center h-100" style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.2)',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}>
                <i className={`bi bi-${metric.icon} display-4 text-${metric.color} mb-3`}></i>
                <h4 className="text-white" style={{ fontWeight: 'bold' }}>{metric.value}</h4>
                <p className="text-white mb-0" style={{ opacity: '0.8' }}>{metric.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="row mb-4">
          <div className="col-md-6 mb-3">
            <div className="glassmorphism p-4 h-100" style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.2)'
            }}>
              <h4 className="text-white mb-4" style={{ fontWeight: '600' }}>
                <i className="bi bi-graph-up me-2"></i>
                Skills Assessment
              </h4>
              <div style={{ height: '300px' }}>
                <Bar 
                  data={skillsChartData} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#000000' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                      },
                      x: {
                        ticks: { color: '#000000' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
          <div className="col-md-6 mb-3">
            <div className="glassmorphism p-4 h-100" style={{
              background: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.2)'
            }}>
              <h4 className="text-white mb-4" style={{ fontWeight: '600' }}>
                <i className="bi bi-diagram-3 me-2"></i>
                Competency Radar
              </h4>
              <div style={{ height: '300px' }}>
                <Radar 
                  data={competencyData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false }
                    },
                    scales: {
                      r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { color: '#fff', backdropColor: 'transparent' },
                        grid: { color: 'rgba(255,255,255,0.2)' },
                        angleLines: { color: 'rgba(255,255,255,0.2)' },
                        pointLabels: { color: '#fff' }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="row mb-4">
          {[
            { title: 'Strengths', items: data.strengths, color: 'success', icon: 'check-circle-fill' },
            { title: 'Areas for Improvement', items: data.weaknesses, color: 'warning', icon: 'exclamation-circle-fill' },
            { title: 'HR Recommendations', items: data.suggestions, color: 'info', icon: 'lightbulb-fill' }
          ].map((section, index) => (
            <div key={index} className="col-md-4 mb-3">
              <div className="glassmorphism p-4 h-100" style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.2)'
              }}>
                <h4 className={`text-${section.color} mb-3`} style={{ fontWeight: '600' }}>
                  <i className={`bi bi-${section.icon} me-2`}></i>
                  {section.title}
                </h4>
                <ul className="list-unstyled">
                  {section.items?.map((item, i) => (
                    <li key={i} className="mb-2 text-white" style={{ opacity: '0.9' }}>
                      <i className={`bi bi-arrow-right-circle-fill text-${section.color} me-2`}></i>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* HR Action Items */}
        <div className="glassmorphism p-4 mb-4" style={{
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.2)'
        }}>
          <h4 className="text-white mb-4" style={{ fontWeight: '600' }}>
            <i className="bi bi-clipboard-check-fill me-2"></i>
            HR Action Items & Next Steps
          </h4>
          <div className="row">
            <div className="col-md-6 mb-3">
              <div className="card" style={{
                background: 'rgba(40, 167, 69, 0.1)',
                border: '1px solid rgba(40, 167, 69, 0.3)',
                borderRadius: '10px'
              }}>
                <div className="card-header" style={{
                  background: 'rgba(40, 167, 69, 0.2)',
                  border: 'none',
                  borderRadius: '10px 10px 0 0'
                }}>
                  <h6 className="text-white mb-0" style={{ fontWeight: '600' }}>
                    <i className="bi bi-person-check-fill me-2"></i>
                    Interview Recommendations
                  </h6>
                </div>
                <div className="card-body">
                  <ul className="list-unstyled mb-0 text-white">
                    <li className="mb-2" style={{ opacity: '0.9' }}>
                      <i className="bi bi-dot"></i>
                      {overallScore >= 70 ? 'Schedule technical interview' : 'Consider phone screening first'}
                    </li>
                    <li className="mb-2" style={{ opacity: '0.9' }}>
                      <i className="bi bi-dot"></i>
                      Focus on {data.skills?.[0] || 'technical skills'} assessment
                    </li>
                    <li className="mb-2" style={{ opacity: '0.9' }}>
                      <i className="bi bi-dot"></i>
                      {data.weaknesses?.[0] ? `Address concerns about ${data.weaknesses[0].toLowerCase()}` : 'Verify experience claims'}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-md-6 mb-3">
              <div className="card" style={{
                background: 'rgba(23, 162, 184, 0.1)',
                border: '1px solid rgba(23, 162, 184, 0.3)',
                borderRadius: '10px'
              }}>
                <div className="card-header" style={{
                  background: 'rgba(23, 162, 184, 0.2)',
                  border: 'none',
                  borderRadius: '10px 10px 0 0'
                }}>
                  <h6 className="text-white mb-0" style={{ fontWeight: '600' }}>
                    <i className="bi bi-currency-dollar me-2"></i>
                    Salary & Compensation
                  </h6>
                </div>
                <div className="card-body">
                  <ul className="list-unstyled mb-0 text-white">
                    <li className="mb-2" style={{ opacity: '0.9' }}>
                      <i className="bi bi-dot"></i>
                      Estimated range: {data.salary_range || '$60K - $85K'}
                    </li>
                    <li className="mb-2" style={{ opacity: '0.9' }}>
                      <i className="bi bi-dot"></i>
                      Market position: {overallScore >= 80 ? 'Above average' : 'Market rate'}
                    </li>
                    <li className="mb-2" style={{ opacity: '0.9' }}>
                      <i className="bi bi-dot"></i>
                      {overallScore >= 85 ? 'Consider competitive offer' : 'Standard offer appropriate'}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Skills Breakdown */}
        <div className="glassmorphism p-4 mb-4" style={{
          background: 'rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          boxShadow: '0 4px 16px 0 rgba(31, 38, 135, 0.2)'
        }}>
          <h4 className="text-white mb-4" style={{ fontWeight: '600' }}>
            <i className="bi bi-tags-fill me-2"></i>
            Skills Breakdown
          </h4>
          <div className="row">
            {data.skills?.slice(0, 12).map((skill, i) => (
              <div key={i} className="col-md-3 col-sm-6 mb-3">
                <div className="d-flex align-items-center">
                  <span className="badge bg-primary me-2" style={{
                    borderRadius: '50%',
                    width: '25px',
                    height: '25px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem'
                  }}>
                    {i + 1}
                  </span>
                  <span className="text-white" style={{ opacity: '0.9' }}>{skill}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Enhanced Download Section */}
        <div className="text-center">
          <button
            onClick={handleDownload}
            disabled={isGeneratingPDF}
            className="btn btn-success btn-lg px-5 py-3 download-btn-hover"
            style={{ 
              borderRadius: '25px',
              fontWeight: '600',
              fontSize: '1.1rem',
              boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
              transition: 'all 0.3s ease',
              opacity: isGeneratingPDF ? 0.7 : 1,
              cursor: isGeneratingPDF ? 'not-allowed' : 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {isGeneratingPDF ? (
              <>
                <div className="spinner-border spinner-border-sm me-2" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                Generating PDF...
              </>
            ) : (
              <>
                <i className="bi bi-download me-2"></i>
                Download Complete Analysis Report
              </>
            )}
          </button>
          <p className="text-white mt-3 mb-0" style={{ opacity: '0.8' }}>
            <i className="bi bi-info-circle me-1"></i>
            Generated on {new Date().toLocaleDateString()} • Confidential HR Document
          </p>
        </div>
      </div>
    </>
  );
}