import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { resume, jd } = req.body;

  if (!resume || typeof resume !== 'string' || resume.trim().length === 0) {
    return res.status(400).json({ error: "Resume text is required and must be a non-empty string" });
  }

  try {
    const prompt = createEnhancedAnalysisPrompt(resume, jd);

    const result = await model.generateContent({
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 3072
      }
    });

    const text = result.response.text().trim();

    let json;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      json = match ? JSON.parse(match[0]) : JSON.parse(text);
    } catch (err) {
      return res.status(500).json({ error: "AI returned invalid JSON.", raw: text });
    }

    if (!validateEnhancedAnalysisResult(json)) {
      throw new Error("Invalid analysis result structure");
    }

    res.status(200).json(json);
  } catch (err) {
    console.error("Error analyzing resume:", err);
    res.status(500).json({ error: "Failed to analyze resume", details: err.message });
  }
}

function createEnhancedAnalysisPrompt(resume, jobDescription = "") {
  return `
You are a senior HR analytics expert with 15+ years of experience in talent acquisition and candidate assessment. Analyze this resume comprehensively from an HR perspective, focusing on hiring decisions, team fit, and long-term potential.

RESUME CONTENT:
${resume}

${jobDescription ? `JOB REQUIREMENTS:\n${jobDescription}\n\nProvide detailed job-specific matching analysis and cultural fit assessment.` : 'Provide general professional assessment without specific job matching.'}

ANALYSIS FRAMEWORK:
- Evaluate technical competencies and soft skills
- Assess leadership potential and team collaboration
- Identify career progression and growth trajectory  
- Consider cultural fit and organizational alignment
- Provide actionable hiring recommendations
- Estimate market value and compensation range
- Flag any potential concerns or red flags

Return ONLY this JSON structure (no additional text):
{
  "summary": "Professional 2-3 sentence executive summary highlighting key qualifications and suitability",
  "match_score": ${jobDescription ? 'NUMBER_0_to_100' : '75'},
  "strengths": [
    "4-5 specific strengths with examples from resume",
    "Include both technical and soft skills",
    "Highlight unique value propositions",
    "Mention leadership or collaborative experiences"
  ],
  "weaknesses": [
    "3-4 honest areas for improvement or concerns",
    "Skills gaps relative to requirements",
    "Experience level considerations", 
    "Any resume presentation issues"
  ],
  "skills": [
    "Extract 10-15 technical and professional skills",
    "Include programming languages, tools, frameworks",
    "Add soft skills like leadership, communication",
    "Include industry-specific competencies"
  ],
  "suggestions": [
    "Specific actionable recommendations for candidate",
    "Interview focus areas and questions to ask",
    "Skills development recommendations",
    "Career advancement advice"
  ],
  "experience_years": "NUMBER_estimated_total_years",
  "education_level": "Bachelor/Master/PhD/Other",
  "salary_range": "$XX,000 - $XX,000 (market rate estimate)",
  "technical_score": NUMBER_0_to_100,
  "communication_score": NUMBER_0_to_100,
  "leadership_score": NUMBER_0_to_100,
  "problem_solving_score": NUMBER_0_to_100,
  "teamwork_score": NUMBER_0_to_100,
  "adaptability_score": NUMBER_0_to_100,
  "interview_readiness": "High/Medium/Low",
  "cultural_fit_indicators": [
    "2-3 cultural fit observations",
    "Team collaboration evidence",
    "Communication style assessment"
  ],
  "red_flags": [
    "Any concerning gaps or inconsistencies",
    "Overqualification or underqualification concerns",
    "Frequent job changes if applicable"
  ],
  "hiring_recommendation": "Strong Hire/Hire/No Hire/Needs More Info",
  "next_steps": [
    "Immediate action items for HR team",
    "Interview scheduling recommendations", 
    "Reference check priorities",
    "Skills assessment suggestions"
  ]
}

SCORING GUIDELINES:
- match_score: Job relevance and requirements fit
- technical_score: Technical skills and expertise level
- communication_score: Written communication evidence in resume
- leadership_score: Leadership experience and potential
- problem_solving_score: Analytical and problem-solving capabilities
- teamwork_score: Collaboration and team experience
- adaptability_score: Career flexibility and learning agility

Base all assessments on actual resume content. Be objective, professional, and constructive in feedback.
`;
}

function validateEnhancedAnalysisResult(result) {
  const requiredFields = [
    'summary', 'match_score', 'strengths', 'weaknesses', 'skills', 'suggestions',
    'experience_years', 'education_level', 'salary_range', 'technical_score',
    'communication_score', 'leadership_score', 'problem_solving_score',
    'teamwork_score', 'adaptability_score', 'interview_readiness',
    'cultural_fit_indicators', 'red_flags', 'hiring_recommendation', 'next_steps'
  ];
  
  if (!result || typeof result !== 'object') return false;

  for (const field of requiredFields) {
    if (!(field in result)) {
      console.log(`Missing field: ${field}`);
      return false;
    }
  }

  const arrayFields = [
    'strengths', 'weaknesses', 'skills', 'suggestions',
    'cultural_fit_indicators', 'red_flags', 'next_steps'
  ];
  
  for (const field of arrayFields) {
    if (!Array.isArray(result[field])) {
      console.log(`Field ${field} is not an array`);
      return false;
    }
  }

  const numericFields = [
    'match_score', 'technical_score', 'communication_score',
    'leadership_score', 'problem_solving_score', 'teamwork_score', 'adaptability_score'
  ];
  
  for (const field of numericFields) {
    if (typeof result[field] !== 'number' || result[field] < 0 || result[field] > 100) {
      console.log(`Field ${field} is not a valid number 0-100`);
      return false;
    }
  }

  const stringFields = ['summary', 'education_level', 'salary_range', 'interview_readiness', 'hiring_recommendation'];
  for (const field of stringFields) {
    if (typeof result[field] !== 'string' || result[field].trim().length === 0) {
      console.log(`Field ${field} is not a valid string`);
      return false;
    }
  }

  return true;
}