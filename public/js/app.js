// Application State
let currentUser = null;
let currentSurvey = null;
let loadingStartTime = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const surveyScreen = document.getElementById('survey-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const welcomeMessage = document.getElementById('welcome-message');
const logoutBtn = document.getElementById('logout-btn');
const surveyLink = document.getElementById('survey-link');
const loadingIndicator = document.getElementById('loading-indicator');
const surveyContent = document.getElementById('survey-content');
const startSurveyBtn = document.getElementById('start-survey-btn');
const surveyFormContainer = document.getElementById('survey-form-container');
const surveyForm = document.getElementById('survey-form');
const surveyQuestions = document.getElementById('survey-questions');
const surveyCompletion = document.getElementById('survey-completion');
const backToDashboard = document.getElementById('back-to-dashboard');
const returnDashboard = document.getElementById('return-dashboard');

// Utility Functions
function showScreen(screenElement) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    screenElement.classList.add('active');
}

function showError(message, errorElement = loginError) {
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

function showLoading() {
    loadingStartTime = Date.now();
    loadingIndicator.style.display = 'block';
    surveyContent.style.display = 'none';
}

function hideLoading() {
    const loadTime = Date.now() - loadingStartTime;
    const minLoadTime = 500; // Minimum time to show loading indicator
    
    setTimeout(() => {
        loadingIndicator.style.display = 'none';
        surveyContent.style.display = 'block';
    }, Math.max(0, minLoadTime - loadTime));
}

// API Functions
async function apiCall(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }
        
        return data;
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Authentication Functions
async function login(username, password) {
    const data = await apiCall('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    currentUser = data.user;
    return data;
}

async function logout() {
    await apiCall('/api/auth/logout', { method: 'POST' });
    currentUser = null;
}

async function checkAuthStatus() {
    try {
        const data = await apiCall('/api/auth/status');
        if (data.authenticated) {
            currentUser = data.user;
            return true;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
    }
    return false;
}

// Survey Functions
async function loadSurvey(surveyId) {
    const data = await apiCall(`/api/survey/${surveyId}`);
    currentSurvey = data.survey;
    return data.survey;
}

async function submitSurvey(surveyId, responses) {
    const data = await apiCall(`/api/survey/${surveyId}/submit`, {
        method: 'POST',
        body: JSON.stringify({ responses })
    });
    return data;
}

// UI Functions
function renderSurveyQuestions(questions) {
    surveyQuestions.innerHTML = '';
    
    questions.forEach((question, index) => {
        const questionDiv = document.createElement('div');
        questionDiv.className = 'survey-question';
        
        let inputHTML = '';
        
        switch (question.type) {
            case 'text':
                inputHTML = `<input type="text" name="question_${question.id}" id="question_${question.id}" ${question.required ? 'required' : ''}>`;
                break;
            case 'textarea':
                inputHTML = `<textarea name="question_${question.id}" id="question_${question.id}" ${question.required ? 'required' : ''}></textarea>`;
                break;
            case 'radio':
                inputHTML = '<div class="radio-group">';
                question.options.forEach((option, optionIndex) => {
                    inputHTML += `
                        <div class="radio-option">
                            <input type="radio" name="question_${question.id}" id="question_${question.id}_${optionIndex}" value="${option}" ${question.required ? 'required' : ''}>
                            <label for="question_${question.id}_${optionIndex}">${option}</label>
                        </div>
                    `;
                });
                inputHTML += '</div>';
                break;
        }
        
        questionDiv.innerHTML = `
            <h3>${question.question} ${question.required ? '<span style="color: red;">*</span>' : ''}</h3>
            ${inputHTML}
        `;
        
        surveyQuestions.appendChild(questionDiv);
    });
}

function collectSurveyResponses() {
    const responses = {};
    const formData = new FormData(surveyForm);
    
    for (let [key, value] of formData.entries()) {
        const questionId = key.replace('question_', '');
        responses[questionId] = value;
    }
    
    return responses;
}

// Event Listeners
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        await login(username, password);
        welcomeMessage.textContent = `Welcome, ${currentUser.username}!`;
        showScreen(dashboardScreen);
    } catch (error) {
        showError(error.message);
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await logout();
        showScreen(loginScreen);
        loginForm.reset();
    } catch (error) {
        console.error('Logout failed:', error);
    }
});

surveyLink.addEventListener('click', async (e) => {
    e.preventDefault();
    showScreen(surveyScreen);
    showLoading();
    
    try {
        // Simulate loading time for performance testing
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const survey = await loadSurvey(1); // Load survey with ID 1
        hideLoading();
        
        // Show instructions first
        document.querySelector('.survey-instructions').style.display = 'block';
        surveyFormContainer.style.display = 'none';
        surveyCompletion.style.display = 'none';
        
    } catch (error) {
        hideLoading();
        showError('Failed to load survey');
        console.error('Survey loading failed:', error);
    }
});

startSurveyBtn.addEventListener('click', () => {
    if (currentSurvey) {
        renderSurveyQuestions(currentSurvey.questions);
        document.querySelector('.survey-instructions').style.display = 'none';
        surveyFormContainer.style.display = 'block';
    }
});

surveyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    try {
        const responses = collectSurveyResponses();
        await submitSurvey(currentSurvey.id, responses);
        
        // Show completion message
        surveyFormContainer.style.display = 'none';
        surveyCompletion.style.display = 'block';
        
    } catch (error) {
        showError('Failed to submit survey');
        console.error('Survey submission failed:', error);
    }
});

backToDashboard.addEventListener('click', () => {
    showScreen(dashboardScreen);
});

returnDashboard.addEventListener('click', () => {
    showScreen(dashboardScreen);
});

// Keyboard Navigation Support
surveyLink.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        surveyLink.click();
    }
});

// Initialize Application
async function initApp() {
    // Check if user is already authenticated
    const isAuthenticated = await checkAuthStatus();
    
    if (isAuthenticated) {
        welcomeMessage.textContent = `Welcome, ${currentUser.username}!`;
        showScreen(dashboardScreen);
    } else {
        showScreen(loginScreen);
    }
}

// Performance Monitoring
function measureLoadTime(startTime, targetTime, deviceType) {
    const loadTime = Date.now() - startTime;
    console.log(`${deviceType} load time: ${loadTime}ms (target: ${targetTime}ms)`);
    
    if (loadTime > targetTime) {
        console.warn(`Load time exceeded target for ${deviceType}`);
    }
    
    return loadTime;
}

// Mobile/Desktop Detection for Performance Testing
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Start the application
document.addEventListener('DOMContentLoaded', initApp);