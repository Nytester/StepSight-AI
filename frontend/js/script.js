/* ======================================================================
   StepSight AI - Frontend Logic (script.js)
   Works with your provided index.html
   ----------------------------------------------------------------------
   - Doctor/Patient login & portal switching
   - Clinical Assessment (risk score) + report downloads
   - MRI Upload & Analyze (backend: http://127.0.0.1:5001/api/v1/mri)
   - Drag & drop, progress, error handling, graceful fallbacks
====================================================================== */

/* ==============================
   GLOBAL APP STATE & CONSTANTS
============================== */

// Application state
const AppState = {
    currentUser: null,
    currentUserType: null, // 'doctor' | 'patient'
    currentAssessment: null,
    currentTestimonial: 0,
    sportsRiskChart: null,

    // MRI tab state
    selectedFile: null,
    analysisResult: null,

    isInitialized: false
};

// Medical disclaimer (used in reports)
const MEDICAL_DISCLAIMER =
    "This assessment is intended for informational and educational purposes only " +
    "and is not a substitute for professional medical advice, diagnosis, or treatment. " +
    "Always consult a qualified healthcare provider for medical concerns.";

// Risk model constants (clinical tab)
const RISK_FACTORS = {
    AGE_PEAK_RISK: { min: 15, max: 25, weight: 15 },
    AGE_MODERATE:  { min: 26, max: 35, weight: 8 },
    AGE_LOW:       { threshold: 35, weight: -5 },
    AGE_YOUNG:     { threshold: 15, weight: 5 },
    BMI_UNDERWEIGHT: { threshold: 18.5, weight: 5 },
    BMI_OBESE:       { threshold: 30, weight: 10 },
    TRAINING_WEIGHT: 2.5,
    TRAINING_MAX: 25,
    FATIGUE_WEIGHT: 2,
    FLEXIBILITY_WEIGHT: 1.5,
    PAST_INJURY_WEIGHT: 20,
    BASE_SCORE: 20,
    GENDER_FEMALE_WEIGHT: 8 // Females have higher ACL injury risk
};

const RISK_THRESHOLDS = { LOW: 30, MODERATE: 60, HIGH: 100 };

const SPORT_RISK_MULTIPLIERS = {
    'basketball': 1.15,
    'soccer': 1.12,
    'football': 1.10,
    'skiing': 1.13,
    'volleyball': 1.08,
    'tennis': 1.05,
    'gymnastics': 1.10,
    'running': 0.95,
    'swimming': 0.90,
    'cycling': 0.92,
    'default': 1.0
};

// MRI backend base URL (your FastAPI service)
const API_BASE_URL = "http://127.0.0.1:5001/api/v1/mri";

// (Optional) Secondary health check (not required to run)
const API_CONFIG = {
    baseURL: 'http://localhost:5000/api/v1',
    timeout: 120000
};

let backendAvailable = true; // We’ll optimistically try the MRI backend and fallback on error.


/* ==============================
   UTILITIES
============================== */

function scrollToPortal() {
    const portalSection = document.getElementById('portalSection');
    if (portalSection) portalSection.scrollIntoView({ behavior: 'smooth' });
}

function scrollToFeatures() {
    const featuresSection = document.getElementById('featuresSection');
    if (featuresSection) featuresSection.scrollIntoView({ behavior: 'smooth' });
}

function showError(msg) {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.textContent = `❌ ${msg}`;
        el.style.display = 'block';
    } else {
        alert(msg);
    }
}

function clearError() {
    const el = document.getElementById('errorMessage');
    if (el) {
        el.textContent = '';
        el.style.display = 'none';
    }
}


/* ==============================
   DOM READY
============================== */

document.addEventListener('DOMContentLoaded', () => {
    if (AppState.isInitialized) return;

    showDisclaimerOnPage();
    initSportsRiskChart();
    initTestimonialsAutoPlay();
    setupClinicalFormListeners();
    setupMRIEventListeners();

    AppState.isInitialized = true;
});


/* ==============================
   LANDING PAGE: DISCLAIMER
============================== */

function showDisclaimerOnPage() {
    const portalSection = document.getElementById('portalSection');
    if (!portalSection) return;

    const disclaimerHTML = `
        <div style="background: #fef2f2; border: 2px solid #ef4444; padding: 20px; 
                    border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.1);">
            <h3 style="color: #dc2626; margin-bottom: 10px; font-size: 1.2rem;">⚠️ Medical Disclaimer</h3>
            <p style="color: #666; line-height: 1.6; font-size: 0.95rem; margin: 0;">${MEDICAL_DISCLAIMER}</p>
        </div>
    `;
    portalSection.insertAdjacentHTML('beforebegin', disclaimerHTML);
}


/* ==============================
   SPORTS RISK CHART (Chart.js)
============================== */

function initSportsRiskChart() {
    const ctx = document.getElementById('sportsRiskChart');
    if (!ctx) return;

    const chartCtx = ctx.getContext('2d');

    AppState.sportsRiskChart = new Chart(chartCtx, {
        type: 'bar',
        data: {
            labels: ['Basketball', 'Soccer', 'Skiing', 'Football', 'Gymnastics', 'Tennis', 'Volleyball', 'Running'],
            datasets: [{
                label: 'ACL Injury Risk Index',
                data: [72, 68, 65, 58, 61, 45, 52, 28],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(34, 197, 94, 0.8)'
                ],
                borderColor: [
                    'rgb(239, 68, 68)', 'rgb(239, 68, 68)', 'rgb(239, 68, 68)',
                    'rgb(245, 158, 11)', 'rgb(245, 158, 11)', 'rgb(245, 158, 11)',
                    'rgb(245, 158, 11)', 'rgb(34, 197, 94)'
                ],
                borderWidth: 2,
                borderRadius: 8,
                hoverBackgroundColor: [
                    'rgba(239, 68, 68, 1)', 'rgba(239, 68, 68, 1)', 'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)', 'rgba(245, 158, 11, 1)', 'rgba(245, 158, 11, 1)',
                    'rgba(245, 158, 11, 1)', 'rgba(34, 197, 94, 1)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: { font: { size: 14, weight: 'bold' }, color: '#333', padding: 15 }
                },
                tooltip: {
                    callbacks: { label: (ctx) => 'Risk Index: ' + ctx.parsed.y + '/100' }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { font: { size: 12 }, color: '#666' },
                    grid: { color: 'rgba(0, 0, 0, 0.05)' }
                },
                x: {
                    ticks: { font: { size: 12, weight: '600' }, color: '#333' },
                    grid: { display: false }
                }
            }
        }
    });
}


/* ==============================
   TESTIMONIALS CAROUSEL
============================== */

function initTestimonialsAutoPlay() {
    setInterval(nextTestimonial, 6000);
}

function getTestimonials() {
    return document.querySelectorAll('.testimonial-card');
}
function getIndicators() {
    return document.querySelectorAll('.indicator');
}

function showTestimonial(index) {
    const testimonials = getTestimonials();
    const indicators = getIndicators();
    const total = testimonials.length;
    if (index < 0 || index >= total) return;

    testimonials.forEach((card) => card.classList.remove('active'));
    indicators.forEach((i) => i.classList.remove('active'));

    if (testimonials[index]) testimonials[index].classList.add('active');
    if (indicators[index]) indicators[index].classList.add('active');

    AppState.currentTestimonial = index;
}

function nextTestimonial() {
    const testimonials = getTestimonials();
    const total = testimonials.length || 1;
    const nextIndex = (AppState.currentTestimonial + 1) % total;
    showTestimonial(nextIndex);
}
function prevTestimonial() {
    const testimonials = getTestimonials();
    const total = testimonials.length || 1;
    const prevIndex = (AppState.currentTestimonial - 1 + total) % total;
    showTestimonial(prevIndex);
}
function goToTestimonial(index) { showTestimonial(index); }

// Expose for inline HTML handlers
window.prevTestimonial = prevTestimonial;
window.nextTestimonial = nextTestimonial;
window.goToTestimonial  = goToTestimonial;
window.scrollToPortal   = scrollToPortal;
window.scrollToFeatures = scrollToFeatures;


/* ==============================
   AUTH / LOGIN
============================== */

function openAuthModal(userType) {
    AppState.currentUserType = userType;
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authTitle');
    const subtitle = document.getElementById('authSubtitle');
    if (!modal || !title || !subtitle) return;

    if (userType === 'doctor') {
        title.textContent = 'Doctor Login';
        subtitle.textContent = 'Enter your credentials to access patient assessments';
    } else {
        title.textContent = 'Patient Login';
        subtitle.textContent = 'Enter your credentials to get your risk assessment';
    }

    modal.classList.add('active');
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    const form = document.getElementById('authForm');
    if (modal) modal.classList.remove('active');
    if (form) form.reset();
}

function handleLogin(event) {
    event.preventDefault();
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    if (!emailInput || !passwordInput) return;

    const email = (emailInput.value || '').trim();
    const password = passwordInput.value || '';

    if (!email || !password) { alert('Please enter both email and password.'); return; }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) { alert('Please enter a valid email address.'); return; }

    AppState.currentUser = {
        email,
        type: AppState.currentUserType,
        name: email.split('@')[0]
    };

    if (AppState.currentUserType === 'doctor') {
        loadDoctorPortal();
    } else {
        loadPatientPortal();
    }
    closeAuthModal();
}

function loadDoctorPortal() {
    const landingPage = document.getElementById('landingPage');
    const doctorPortal = document.getElementById('doctorPortalApp');
    const doctorNameSpan = document.getElementById('doctorName');

    if (landingPage) landingPage.style.display = 'none';
    if (doctorPortal) doctorPortal.classList.add('active');
    if (doctorNameSpan) doctorNameSpan.textContent = AppState.currentUser.name;
    setupClinicalFormListeners();
}

function loadPatientPortal() {
    const landingPage = document.getElementById('landingPage');
    const doctorPortal = document.getElementById('doctorPortalApp');
    const doctorNameSpan = document.getElementById('doctorName');
    const patientInfoBox = document.querySelector('.patient-info-box');
    const dashboardTitle = document.querySelector('.dashboard-title');
    const portalNav = document.querySelector('.portal-nav');
    const userBadge = document.querySelector('.user-badge');

    if (landingPage) landingPage.style.display = 'none';
    if (doctorPortal) doctorPortal.classList.add('active');
    if (doctorNameSpan) doctorNameSpan.textContent = AppState.currentUser.name;
    if (patientInfoBox) patientInfoBox.style.display = 'none';
    if (dashboardTitle) dashboardTitle.textContent = 'Patient Assessment';
    if (portalNav) portalNav.style.display = 'none'; // hide MRI tab for patients

    if (userBadge) {
        userBadge.classList.remove('doctor');
        userBadge.classList.add('patient');
        userBadge.style.background = 'rgba(245, 87, 108, 0.1)';
        userBadge.style.color = '#f5576c';
        userBadge.innerHTML = 'Patient: <span id="doctorName">' + AppState.currentUser.name + '</span>';
    }

    const assessmentTab = document.getElementById('assessment-tab');
    if (assessmentTab) {
        assessmentTab.classList.add('active');
        assessmentTab.style.display = 'block';
    }
    setupClinicalFormListeners();
}

function logout() {
    AppState.currentUser = null;
    AppState.currentUserType = null;
    AppState.currentAssessment = null;

    const doctorPortal = document.getElementById('doctorPortalApp');
    const landingPage = document.getElementById('landingPage');
    const authForm = document.getElementById('authForm');
    const resultsSection = document.getElementById('resultsSection');
    const patientInfoBox = document.querySelector('.patient-info-box');
    const dashboardTitle = document.querySelector('.dashboard-title');

    if (doctorPortal) doctorPortal.classList.remove('active');
    if (landingPage) landingPage.style.display = 'block';
    if (authForm) authForm.reset();
    if (resultsSection) resultsSection.classList.remove('active');
    if (patientInfoBox) patientInfoBox.style.display = 'block';
    if (dashboardTitle) dashboardTitle.textContent = 'Doctor Dashboard';
}

// Expose for inline HTML handlers
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.handleLogin = handleLogin;
window.logout = logout;


/* ==============================
   DOCTOR PORTAL: TAB NAVIGATION
============================== */

function showDoctorTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.doctor-tab').forEach(tab => tab.classList.remove('active'));
    // Deactivate all buttons
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));

    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) selectedTab.classList.add('active');

    // Activate the matching nav button (based on its inline onclick string)
    document.querySelectorAll('.nav-tab').forEach(btn => {
        const onClickStr = btn.getAttribute('onclick') || '';
        if (onClickStr.includes(`'${tabName}'`)) btn.classList.add('active');
    });

    // Reset MRI UI state when switching in
    if (tabName === 'mri') {
        // show empty state
        const empty = document.getElementById('emptyState');
        const loading = document.getElementById('loadingState');
        const content = document.getElementById('analysisContent');
        if (empty)   empty.style.display = 'block';
        if (loading) loading.style.display = 'none';
        if (content) content.style.display = 'none';
        clearError();
    }
}
window.showDoctorTab = showDoctorTab;


/* ==============================
   CLINICAL ASSESSMENT
============================== */

function setupClinicalFormListeners() {
    const form = document.getElementById('doctorAssessmentForm');
    const fatigueSlider = document.getElementById('fatigue');
    const flexibilitySlider = document.getElementById('flexibility');

    if (form) {
        // Remove duplicate listeners by cloning
        const newForm = form.cloneNode(true);
        form.parentNode.replaceChild(newForm, form);
        newForm.addEventListener('submit', analyzeDoctorAssessment);
    }

    if (fatigueSlider) {
        fatigueSlider.addEventListener('input', (e) => {
            const valueSpan = document.getElementById('fatigueValue');
            if (valueSpan) valueSpan.textContent = e.target.value;
        });
    }

    if (flexibilitySlider) {
        flexibilitySlider.addEventListener('input', (e) => {
            const valueSpan = document.getElementById('flexibilityValue');
            if (valueSpan) valueSpan.textContent = e.target.value;
        });
    }
}

function validateBMI(bmi) {
    if (isNaN(bmi) || bmi < 10 || bmi > 60) {
        throw new Error('BMI value appears invalid. Please enter a value between 10 and 60.');
    }
    return true;
}
function validateAge(age) {
    if (isNaN(age) || age < 10 || age > 100) {
        throw new Error('Age must be between 10 and 100.');
    }
    return true;
}
function validateTraining(hours) {
    if (isNaN(hours) || hours < 0 || hours > 50) {
        throw new Error('Training hours must be between 0 and 50 per week.');
    }
    return true;
}

function analyzeDoctorAssessment(event) {
    event.preventDefault();

    try {
        const age = parseInt(document.getElementById('age').value);
        validateAge(age);

        const bmi = parseFloat(document.getElementById('bmi').value);
        validateBMI(bmi);

        const training = parseFloat(document.getElementById('training').value);
        validateTraining(training);

        const gender = document.getElementById('gender').value;
        const sport = document.getElementById('sport').value.trim();
        const fatigue = parseInt(document.getElementById('fatigue').value);
        const flexibility = parseInt(document.getElementById('flexibility').value);
        const pastInjury = document.getElementById('pastInjury').value === 'yes';

        // Patient info (only for doctor portal)
        let patientInfo = {};
        if (AppState.currentUserType === 'doctor') {
            const patientName = document.getElementById('patientName')?.value || 'N/A';
            const patientID = document.getElementById('patientID')?.value || 'N/A';
            const dateOfBirth = document.getElementById('dateOfBirth')?.value || 'N/A';
            const contactNumber = document.getElementById('contactNumber')?.value || 'N/A';
            patientInfo = { patientName, patientID, dateOfBirth, contactNumber };
        }

        AppState.currentAssessment = {
            ...patientInfo,
            age, gender, bmi, sport, training, fatigue, flexibility, pastInjury,
            assessmentDate: new Date().toLocaleDateString(),
            assessmentTime: new Date().toLocaleTimeString()
        };

        const resultsSection = document.getElementById('resultsSection');
        const loading = document.getElementById('loading');
        const resultsContent = document.getElementById('resultsContent');

        if (!resultsSection || !loading || !resultsContent) return;

        resultsSection.classList.add('active');
        resultsContent.style.display = 'none';
        loading.classList.add('active');

        setTimeout(() => {
            const riskScore = calculateRiskScore(
                age, gender, bmi, sport, training, fatigue, flexibility, pastInjury
            );
            displayResults(riskScore);
            loading.classList.remove('active');
            resultsContent.style.display = 'block';
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        }, 800);

    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function calculateRiskScore(age, gender, bmi, sport, training, fatigue, flexibility, pastInjury) {
    let score = RISK_FACTORS.BASE_SCORE;

    // Age
    if (age >= RISK_FACTORS.AGE_PEAK_RISK.min && age <= RISK_FACTORS.AGE_PEAK_RISK.max) {
        score += RISK_FACTORS.AGE_PEAK_RISK.weight;
    } else if (age > RISK_FACTORS.AGE_MODERATE.min && age <= RISK_FACTORS.AGE_MODERATE.max) {
        score += RISK_FACTORS.AGE_MODERATE.weight;
    } else if (age > RISK_FACTORS.AGE_LOW.threshold) {
        score += RISK_FACTORS.AGE_LOW.weight;
    } else {
        score += RISK_FACTORS.AGE_YOUNG.weight;
    }

    // Gender
    if (gender === 'female') score += RISK_FACTORS.GENDER_FEMALE_WEIGHT;

    // BMI
    if (bmi < RISK_FACTORS.BMI_UNDERWEIGHT.threshold) score += RISK_FACTORS.BMI_UNDERWEIGHT.weight;
    else if (bmi > RISK_FACTORS.BMI_OBESE.threshold) score += RISK_FACTORS.BMI_OBESE.weight;

    // Training
    const trainingScore = Math.min(training * RISK_FACTORS.TRAINING_WEIGHT, RISK_FACTORS.TRAINING_MAX);
    score += trainingScore;

    // Fatigue
    score += fatigue * RISK_FACTORS.FATIGUE_WEIGHT;

    // Flexibility (lower flexibility => higher risk, baseline at 5)
    score -= (flexibility - 5) * RISK_FACTORS.FLEXIBILITY_WEIGHT;

    // Past Injury
    if (pastInjury) score += RISK_FACTORS.PAST_INJURY_WEIGHT;

    // Sport multiplier
    const sportLower = (sport || '').toLowerCase();
    let multiplier = SPORT_RISK_MULTIPLIERS.default;
    for (const [sportKey, mult] of Object.entries(SPORT_RISK_MULTIPLIERS)) {
        if (sportLower.includes(sportKey)) { multiplier = mult; break; }
    }

    score *= multiplier;
    return Math.max(0, Math.min(100, Math.round(score)));
}

function displayResults(score) {
    const riskCircle = document.getElementById('riskCircle');
    const riskLabel = document.getElementById('riskLabel');
    const riskDescription = document.getElementById('riskDescription');
    const recommendationsDiv = document.getElementById('recommendations');
    const riskScoreSpan = document.getElementById('riskScore');
    if (!riskCircle || !riskLabel || !riskDescription || !recommendationsDiv || !riskScoreSpan) return;

    riskScoreSpan.textContent = score;
    riskCircle.className = 'risk-circle';

    let label, description, riskClass, recommendations;

    if (score < RISK_THRESHOLDS.LOW) {
        riskClass = 'low';
        label = 'Low Risk';
        description = 'This assessment indicates a relatively low ACL injury risk based on the provided factors. Continue with current preventive measures and regular training.';
        recommendations = `
            <ul style="margin-left: 20px; line-height: 1.8;">
                <li><strong>Strength Training:</strong> Continue lower-body strength 3x/week (quads, hammies, glutes)</li>
                <li><strong>Flexibility:</strong> Maintain stretching with hip/ankle mobility</li>
                <li><strong>Monitoring:</strong> Track fatigue during intense blocks</li>
                <li><strong>Follow-up:</strong> Reassess in 6–12 months or after major training changes</li>
                <li><strong>Prevention:</strong> Consider neuromuscular training programs</li>
            </ul>
        `;
    } else if (score < RISK_THRESHOLDS.MODERATE) {
        riskClass = 'medium';
        label = 'Moderate Risk';
        description = 'This assessment indicates moderate ACL injury risk. Consider implementing enhanced preventive measures and monitoring closely during high-intensity activities.';
        recommendations = `
            <ul style="margin-left: 20px; line-height: 1.8;">
                <li><strong>Flexibility:</strong> Increase to 4–5 sessions/week</li>
                <li><strong>Proprioception:</strong> Add balance work (single-leg stands, wobble board) 3x/week</li>
                <li><strong>Load:</strong> Reduce peak intensity by ~15–20% then progress</li>
                <li><strong>Recovery:</strong> At least 1–2 rest days/week</li>
                <li><strong>Technique:</strong> Review landing/cutting mechanics with coach or PT</li>
                <li><strong>Follow-up:</strong> Reassess in 3–6 months</li>
            </ul>
        `;
    } else {
        riskClass = 'high';
        label = 'Higher Risk';
        description = 'This assessment indicates elevated ACL injury risk. A comprehensive injury prevention program is strongly recommended, along with consultation with a sports medicine specialist.';
        recommendations = `
            <ul style="margin-left: 20px; line-height: 1.8;">
                <li><strong>Consultation:</strong> See sports med physician or orthopedist</li>
                <li><strong>Program:</strong> Implement evidence-based ACL prevention (FIFA 11+, PEP)</li>
                <li><strong>Mobility:</strong> Daily stretching; consider working with PT</li>
                <li><strong>Advanced Proprioception:</strong> Supervised plyometrics/balance training</li>
                <li><strong>Load:</strong> Reduce training volume 20–30% until risk factors improve</li>
                <li><strong>Biomechanics:</strong> Consider video analysis of jumps/landings</li>
                <li><strong>Follow-up:</strong> Reassess in 6–8 weeks</li>
            </ul>
        `;
    }

    riskCircle.classList.add(riskClass);
    riskLabel.textContent = label;
    riskDescription.textContent = description;
    recommendationsDiv.innerHTML = recommendations;

    // Store for report generation
    AppState.currentAssessment.riskScore = score;
    AppState.currentAssessment.riskLevel = label;
}

function downloadReport(type) {
    if (!AppState.currentAssessment) {
        alert('No assessment data available. Please complete an assessment first.');
        return;
    }

    const a = AppState.currentAssessment;
    const date = new Date().toLocaleDateString();
    const time = new Date().toLocaleTimeString();

    let reportContent = '';

    if (type === 'doctor') {
        reportContent = `
═══════════════════════════════════════════════════════
        STEPSIGHT AI - CLINICAL ASSESSMENT REPORT
═══════════════════════════════════════════════════════

${MEDICAL_DISCLAIMER}

REPORT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: ${date} at ${time}
Assessed by: ${AppState.currentUser?.name || 'N/A'}
Assessment Date: ${a.assessmentDate}

PATIENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name: ${a.patientName || 'N/A'}
Patient ID: ${a.patientID || 'N/A'}
Date of Birth: ${a.dateOfBirth || 'N/A'}
Contact: ${a.contactNumber || 'N/A'}

CLINICAL DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Age: ${a.age} years
Gender: ${a.gender}
BMI: ${a.bmi} kg/m²
Primary Sport: ${a.sport}
Training Volume: ${a.training} hours/week
Fatigue Level: ${a.fatigue}/10
Flexibility Score: ${a.flexibility}/10
Previous ACL Injury: ${a.pastInjury ? 'Yes' : 'No'}

RISK ASSESSMENT RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ACL Injury Risk Score: ${a.riskScore}/100
Risk Classification: ${a.riskLevel}

RISK FACTORS ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Age Factor: ${a.age >= 15 && a.age <= 25 ? 'Peak risk age group' : a.age > 35 ? 'Lower risk age' : 'Moderate risk age'}
• Gender Factor: ${a.gender === 'female' ? 'Elevated risk (female athletes have 2-8x higher ACL injury rates)' : 'Standard risk'}
• BMI Status: ${a.bmi < 18.5 ? 'Underweight - increased risk' : a.bmi > 30 ? 'Obese - increased risk' : 'Normal range'}
• Training Load: ${a.training > 15 ? 'High volume - monitor for overtraining' : 'Moderate volume'}
• Fatigue Level: ${a.fatigue > 7 ? 'High - significant risk factor' : a.fatigue > 4 ? 'Moderate' : 'Low'}
• Flexibility: ${a.flexibility < 5 ? 'Poor - increased risk' : a.flexibility > 7 ? 'Good' : 'Fair'}
• Injury History: ${a.pastInjury ? 'Previous ACL injury - highest risk factor' : 'No previous injury'}

CLINICAL RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[See detailed recommendations in assessment report]

FOLLOW-UP PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Recommended Follow-up: ${a.riskScore >= 60 ? '6-8 weeks' : a.riskScore >= 30 ? '3-6 months' : '6-12 months'}
Specialist Referral: ${a.riskScore >= 60 ? 'Recommended' : 'Not required at this time'}

═══════════════════════════════════════════════════════
This report is generated by StepSight AI for clinical 
reference purposes. All medical decisions should be made
by qualified healthcare professionals.
═══════════════════════════════════════════════════════
        `;
    } else {
        reportContent = `
═══════════════════════════════════════════════════════
        STEPSIGHT AI - PATIENT ASSESSMENT REPORT
═══════════════════════════════════════════════════════

${MEDICAL_DISCLAIMER}

YOUR ASSESSMENT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Date: ${date}
Your Risk Score: ${a.riskScore}/100
Risk Level: ${a.riskLevel}

WHAT THIS MEANS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${a.riskScore < 30
? 'Your assessment shows a relatively low risk for ACL injury. Continue your current training and prevention routine.'
: a.riskScore < 60
? 'Your assessment shows moderate risk. Consider working with a trainer or therapist to improve specific risk factors.'
: 'Your assessment shows elevated risk. We strongly recommend consulting with a healthcare professional.'}

YOUR RISK FACTORS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Sport: ${a.sport}
✓ Training: ${a.training} hours per week
✓ Fatigue: ${a.fatigue}/10
✓ Flexibility: ${a.flexibility}/10
${a.pastInjury ? '⚠ Previous ACL injury noted' : '✓ No previous ACL injury'}

RECOMMENDED ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[See detailed recommendations in your assessment]

NEXT STEPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Review your personalized recommendations
2. ${a.riskScore >= 60 ? 'Schedule consultation with sports medicine specialist' : 'Continue with preventive exercises'}
3. Monitor your progress and reassess in ${a.riskScore >= 60 ? '6-8 weeks' : a.riskScore >= 30 ? '3-6 months' : '6-12 months'}

═══════════════════════════════════════════════════════
Questions? Contact your healthcare provider or visit
StepSight AI support for more information.
═══════════════════════════════════════════════════════
        `;
    }

    // Download as .txt (simple & portable)
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const prefix = type === 'doctor' ? 'Clinical' : 'Patient';
    link.download = `StepSight_${prefix}_Report_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
window.downloadReport = downloadReport;


/* ==============================
   MRI TAB (UPLOAD & ANALYZE)
============================== */

function setupMRIEventListeners() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const analyzeBtn = document.getElementById('analyzeBtn');

    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');

    const emptyState = document.getElementById('emptyState');
    const loadingState = document.getElementById('loadingState');
    const analysisContent = document.getElementById('analysisContent');

    if (!fileInput || !analyzeBtn) return;

    // Drag & drop styling
    if (dropZone) {
        ;['dragenter', 'dragover'].forEach(evt =>
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault(); e.stopPropagation();
                dropZone.classList.add('drag-over');
            })
        );
        ;['dragleave', 'drop'].forEach(evt =>
            dropZone.addEventListener(evt, (e) => {
                e.preventDefault(); e.stopPropagation();
                dropZone.classList.remove('drag-over');
            })
        );

        dropZone.addEventListener('click', () => fileInput.click());

        dropZone.addEventListener('drop', (e) => {
            const dtFiles = e.dataTransfer?.files;
            if (dtFiles && dtFiles.length > 0) {
                fileInput.files = dtFiles; // set file input programmatically
                handleFileSelection(dtFiles[0]);
            }
        });
    }

    // Traditional file input
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files?.[0];
        if (file) handleFileSelection(file);
    });

    function handleFileSelection(file) {
        AppState.selectedFile = file;
        clearError();

        const fileName = document.getElementById('fileName');
        const fileSize = document.getElementById('fileSize');
        if (fileName) fileName.innerText = `📁 ${file.name}`;
        if (fileSize) fileSize.innerText = `(${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        analyzeBtn.disabled = false;

        // UI states
        if (emptyState) emptyState.style.display = 'block';
        if (loadingState) loadingState.style.display = 'none';
        if (analysisContent) analysisContent.style.display = 'none';

        if (progressBar) progressBar.classList.remove('show');
        if (progressFill) progressFill.style.width = '0%';
    }

    // Analyze handler
    analyzeBtn.addEventListener('click', async () => {
        if (!AppState.selectedFile) {
            showError('Please upload an MRI image first!');
            return;
        }

        // UI: show loading
        if (emptyState) emptyState.style.display = 'none';
        if (loadingState) loadingState.style.display = 'block';
        if (analysisContent) analysisContent.style.display = 'none';
        if (progressBar) progressBar.classList.add('show');
        if (progressFill) progressFill.style.width = '15%';

        try {
            // 1) Upload
            const uploadId = await uploadMRItoBackend(AppState.selectedFile, progressFill);
            // 2) Analyze
            const result = await analyzeMRIBackend(uploadId, progressFill);

            // Show results
            if (loadingState) loadingState.style.display = 'none';
            if (analysisContent) analysisContent.style.display = 'block';
            if (progressFill) progressFill.style.width = '100%';
            setTimeout(() => { if (progressBar) progressBar.classList.remove('show'); }, 500);

            populateMRIResults(result);
        } catch (err) {
            if (loadingState) loadingState.style.display = 'none';
            setTimeout(() => { if (progressBar) progressBar.classList.remove('show'); }, 500);
            showError(err.message || 'Analysis failed');

            // Graceful demo fallback
            populateMRIResults(getDemoMRIResult());
            if (analysisContent) analysisContent.style.display = 'block';
        }
    });
}

// Upload file to backend
async function uploadMRItoBackend(file, progressFillEl) {
    const formData = new FormData();
    formData.append("file", file);

    if (progressFillEl) progressFillEl.style.width = '35%';

    const resp = await fetch(`${API_BASE_URL}/upload`, { method: "POST", body: formData });
    let data = null;
    try { data = await resp.json(); } catch(e) {}

    if (!resp.ok) {
        const msg = data?.error || `Upload failed (status ${resp.status})`;
        throw new Error(msg);
    }
    if (progressFillEl) progressFillEl.style.width = '55%';
    const uploadId = data?.upload_id;
    if (!uploadId) throw new Error('Upload failed: missing upload_id');
    return uploadId;
}

// Request analysis
async function analyzeMRIBackend(uploadId, progressFillEl) {
    if (progressFillEl) progressFillEl.style.width = '70%';
    const resp = await fetch(`${API_BASE_URL}/analyze/${uploadId}`);
    let data = null;
    try { data = await resp.json(); } catch(e) {}

    if (!resp.ok) {
        const msg = data?.error || `Analysis failed (status ${resp.status})`;
        throw new Error(msg);
    }
    if (progressFillEl) progressFillEl.style.width = '90%';
    return data;
}

// Render analysis results into the MRI tab
function populateMRIResults(result) {
    // Store for report downloads
    AppState.analysisResult = {
        riskScore: result.risk_score,
        severityLevel: result.severity_level,
        findings: result.findings?.structural || [],
        tears: result.findings?.tears || [],
        surrounding: result.findings?.surrounding || [],
        severity: result.findings?.severity || [],
        treatment: result.findings?.recommendations || [],
        uploadId: result.upload_id,
        timestamp: result.analysis_timestamp
    };

    // Score
    const acuityScore = document.getElementById('acuityScore');
    if (acuityScore) acuityScore.textContent = `${result.risk_score}%`;

    // Severity summary
    const severityAssessment = document.getElementById('severityAssessment');
    if (severityAssessment) {
        severityAssessment.innerHTML = `
            <div class="finding-item severity-${result.severity_level}">
                Overall Severity: ${String(result.severity_level || '').toUpperCase()}
            </div>
        `;
    }

    // Sections
    setFindingListHTML('structuralFindings', result.findings?.structural, "No structural findings available.");
    setFindingListHTML('tearAnalysis',        result.findings?.tears,      "No ligament tear details.");
    setFindingListHTML('surroundingTissues',  result.findings?.surrounding,"No tissue findings available.");

    // Treatment plan
    const treatmentPlan = document.getElementById('treatmentPlan');
    if (treatmentPlan) {
        const recs = result.findings?.recommendations || ["No treatment recommendations"];
        treatmentPlan.textContent = recs.join('\n');
    }
}

function setFindingListHTML(elementId, findingsArray, emptyMsg) {
    const el = document.getElementById(elementId);
    if (!el) return;

    const items = (findingsArray || []).map(f => {
        const sev = typeof f.severity === 'string' ? f.severity : 'info';
        const txt = typeof f.text === 'string' ? f.text : String(f);
        return `<div class="finding-item severity-${sev}">• ${txt}</div>`;
    });

    el.innerHTML = items.length > 0 ? items.join('') : emptyMsg;
}

// Demo fallback result (used when backend fails)
function getDemoMRIResult() {
    return {
        risk_score: 62,
        severity_level: 'moderate',
        findings: {
            structural: [
                { severity: 'moderate', text: 'Mild thickening of ACL fibers with intermediate signal intensity.' },
                { severity: 'low', text: 'No frank discontinuity noted.' }
            ],
            tears: [
                { severity: 'low', text: 'No complete ACL tear; low suspicion for partial sprain.' }
            ],
            surrounding: [
                { severity: 'low', text: 'Menisci intact. No significant joint effusion.' }
            ],
            severity: [
                { severity: 'moderate', text: 'Overall moderate concern for ACL strain without full-thickness tear.' }
            ],
            recommendations: [
                'Relative rest and activity modification for 2–3 weeks.',
                'Supervised physiotherapy emphasizing hamstring/quadriceps balance.',
                'Neuromuscular training and progressive plyometrics as tolerated.',
                'Follow-up MRI if symptoms persist > 6–8 weeks or deteriorate.'
            ]
        },
        upload_id: 'DEMO-LOCAL',
        analysis_timestamp: new Date().toISOString()
    };
}


/* ==============================
   MRI REPORT DOWNLOAD
============================== */

async function downloadMRIReport(type) {
    if (!AppState.analysisResult) {
        alert('No analysis results available. Please analyze an MRI image first.');
        return;
    }

    // For now we generate client-side .txt; if your backend has a /report endpoint,
    // you can fetch it here instead (left simple/portable by default).
    if (type === 'email') {
        alert('📧 Email feature coming soon! (This would email the report to the patient/physician.)');
        return;
    }

    const r = AppState.analysisResult;
    const fileName = AppState.selectedFile ? AppState.selectedFile.name : 'Unknown';

    const reportContent = `
═══════════════════════════════════════════════════════
          STEPSIGHT AI - MRI ANALYSIS REPORT
═══════════════════════════════════════════════════════

⚠️ IMPORTANT: This is a DEMO report for educational purposes only.
NOT for clinical use.

REPORT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Generated: ${new Date().toLocaleString()}
Analyzed by: ${AppState.currentUser ? AppState.currentUser.name : 'System'}
File: ${fileName}

ANALYSIS RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Risk Score: ${r.riskScore}%
Severity Level: ${String(r.severityLevel || '').toUpperCase()}

STRUCTURAL FINDINGS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(r.findings || []).map(f => '• ' + f.text).join('\n') || '—'}

LIGAMENT TEAR ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(r.tears || []).map(t => '• ' + t.text).join('\n') || '—'}

SURROUNDING TISSUES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(r.surrounding || []).map(s => '• ' + s.text).join('\n') || '—'}

SEVERITY ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(r.severity || []).map(s => '• ' + s.text).join('\n') || '—'}

RECOMMENDED TREATMENT PLAN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${(r.treatment || []).join('\n') || '—'}

═══════════════════════════════════════════════════════
${MEDICAL_DISCLAIMER}
═══════════════════════════════════════════════════════
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `StepSight_MRI_Analysis_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    alert('✅ MRI Analysis Report downloaded successfully!');
}
window.downloadMRIReport = downloadMRIReport;
