// Constants and Configuration
const ENDPOINT = "https://zone01normandie.org/api/graphql-engine/v1/graphql";
const AUTH_ENDPOINT = "https://zone01normandie.org/api/auth/signin";

/**
 * Manage headers and request options for API calls
 */
const apiConfig = {
    headers: {
        "content-type": "application/json",
    },
    getOptions() {
        return {
            method: "POST",
            headers: this.headers
        };
    }
};

/**
 * Render the home/login page
 * Clears previous content and creates login interface
 */
function renderHomePage() {
    const container = document.getElementById('container');
    
    // Clear previous content
    container.innerHTML = '';
    container.classList.add('home');

    // Create error display div
    const divError = createErrorDiv();
    container.appendChild(divError);
    
    // Create login container
    const divConnexion = createLoginContainer();
    container.appendChild(divConnexion);

    // Add event listener for login button
    const buttonConnexion = document.getElementById('buttonConnexion');
    buttonConnexion.addEventListener('click', handleLogin);
}

/**
 * Create error message div
 * @returns {HTMLDivElement} Error message container
 */
function createErrorDiv() {
    const divError = document.createElement('div');
    divError.id = 'divError';
    divError.className = 'divError';
    divError.style.display = 'none';
    return divError;
}

/**
 * Create login container with inputs and login button
 * @returns {HTMLDivElement} Login container
 */
function createLoginContainer() {
    const divConnexion = document.createElement('div');
    divConnexion.className = 'divConnexion';

    // Title
    const titleDiv = document.createElement('div');
    titleDiv.className = 'titledivConnexion';
    titleDiv.textContent = "GraphQL";
    divConnexion.appendChild(titleDiv);

    // Login text
    const loginText = document.createElement('textlog');
    loginText.textContent = 'Log in';
    divConnexion.appendChild(loginText);

    // Username input
    const inputUser = document.createElement('input');
    inputUser.id = 'inputuser';
    inputUser.type = 'text';
    inputUser.placeholder = 'Username / email';
    divConnexion.appendChild(inputUser);

    // Password input
    const inputPassword = document.createElement('input');
    inputPassword.id = 'inputpassword';
    inputPassword.type = 'password';
    inputPassword.placeholder = 'Password';
    divConnexion.appendChild(inputPassword);

    // Login button
    const buttonConnexion = document.createElement('button');
    buttonConnexion.id = 'buttonConnexion';
    buttonConnexion.className = 'buttonConnexion';
    buttonConnexion.textContent = 'Login';
    divConnexion.appendChild(buttonConnexion);

    // Login image
    const imgLogin = document.createElement('img');
    imgLogin.src = '/images/image login.webp';
    imgLogin.alt = 'Login Image';
    imgLogin.className = 'imgLogin';
    divConnexion.appendChild(imgLogin);

    return divConnexion;
}

/**
 * Handle user login process
 * Authenticates user and fetches user data
 */
function handleLogin() {
    const username = document.getElementById('inputuser').value;
    const password = document.getElementById('inputpassword').value;
    
    // Encode credentials
    const encodedCredentials = btoa(`${username}:${password}`);

    // Authenticate user
    fetch(AUTH_ENDPOINT, {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer' + encodedCredentials
        },
    })
    .then(handleLoginResponse)
    .then(token => {
        // Update headers with authentication token
        apiConfig.headers.Authorization = 'Bearer ' + token;
        return fetchUserData();
    })
    .catch(handleLoginError);
}

/**
 * Handle login response
 * @param {Response} response - Fetch API response
 * @returns {Promise} Parsed response data
 */
function handleLoginResponse(response) {
    const divError = document.getElementById('divError');
    
    if (!response.ok) {
        divError.textContent = response.status === 401 
            ? 'Username or password incorrect' 
            : `Error code: ${response.status}`;
        
        divError.style.display = 'block';
        throw new Error(`Network error: ${response.status}`);
    }
    
    return response.json();
}

/**
 * Handle login errors
 * @param {Error} error - Login error
 */
function handleLoginError(error) {
    console.error('Data retrieval error:', error);
}

/**
 * Fetch comprehensive user data using GraphQL queries
 * @returns {Promise<Object>} User data object
 */
async function fetchUserData() {
    const user = {};

    // Fetch user personal information
    const userInfoResponse = await executeGraphQLQuery(getUserInfoQuery());
    user.firstName = userInfoResponse.data.user[0].firstName;
    user.lastName = userInfoResponse.data.user[0].lastName;

    // Fetch user level
    const userLevelResponse = await executeGraphQLQuery(getUserLevelQuery());
    user.lvl = userLevelResponse.data.user[0].events[0].level;

    // Fetch user XP transactions
    const userXPResponse = await executeGraphQLQuery(getUserXPQuery());
    user.listTransaction = userXPResponse.data.transaction;
    user.maxXP = calculateTotalXP(user.listTransaction);

    // Fetch XP up and down transactions
    const [xpDownResponse, xpUpResponse] = await Promise.all([
        executeGraphQLQuery(getXPDownQuery()),
        executeGraphQLQuery(getXPUpQuery())
    ]);

    user.XPdown = xpDownResponse.data.transaction_aggregate.aggregate.sum.amount;
    user.XPup = xpUpResponse.data.transaction_aggregate.aggregate.sum.amount;

    // Update page with user data
    updateDashboard(user);
}

/**
 * Execute GraphQL query
 * @param {Object} queryObject - GraphQL query object
 * @returns {Promise<Object>} Query response
 */
async function executeGraphQLQuery(queryObject) {
    const options = apiConfig.getOptions();
    options.body = JSON.stringify(queryObject);

    const response = await fetch(ENDPOINT, options);
    const data = await response.json();

    if (data.errors) {
        console.error("GraphQL Query Error:", data.errors);
    }

    return data;
}

// GraphQL Query Generators
function getUserInfoQuery() {
    return {
        "query": `{
            user {
                lastName
                firstName
            }
        }`
    };
}

function getUserLevelQuery() {
    return {
        "query": `{
            user {
                events(where: {event: {path: {_ilike: "/rouen/div-01"}}}) {
                    level
                }
            }
        }`
    };
}

function getUserXPQuery() {
    return {
        "query": `{
            transaction(
                where: {
                    type: {_eq: "xp"}, 
                    event: {path: {_ilike: "/rouen/div-01"}}
                }, 
                order_by: {id: asc}
            ) {
                amount
                createdAt
            }
        }`
    };
}

function getXPDownQuery() {
    return {
        "query": `{
            transaction_aggregate(
                where: {
                    type: {_eq: "down"}, 
                    event: {path: {_ilike: "/rouen/div-01"}}
                }, 
                order_by: {id: asc}
            ) {
                aggregate { sum { amount } }
            }
        }`
    };
}

function getXPUpQuery() {
    return {
        "query": `{
            transaction_aggregate(
                where: {
                    type: {_eq: "up"}, 
                    event: {path: {_ilike: "/rouen/div-01"}}
                }, 
                order_by: {id: asc}
            ) {
                aggregate { sum { amount } }
            }
        }`
    };
}

/**
 * Calculate total XP from transactions
 * @param {Array} transactions - List of XP transactions
 * @returns {number} Total XP
 */
function calculateTotalXP(transactions) {
    return transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
}

/**
 * Update dashboard with user information
 * @param {Object} user - User data object
 */
function updateDashboard(user) {
    const container = document.getElementById('container');
    container.classList.remove('home');
    container.innerHTML = '';

    // Welcome message
    const welcomeMessage = createWelcomeMessage(user.firstName);
    container.appendChild(welcomeMessage);

    // User information section
    const userSection = createUserSection(user);
    container.appendChild(userSection);

    // Audit information section
    const auditSection = createAuditSection(user);
    userSection.querySelector('.divInfo').appendChild(auditSection);

    // XP Graph section
    const graphSection = createXPGraphSection(user);
    container.appendChild(graphSection);

    // Footer
    const footer = createFooter();
    container.appendChild(footer);

    // Logout event listener
    document.getElementById('logout').addEventListener('click', renderHomePage);
}

// Helper functions for dashboard creation
function createWelcomeMessage(firstName) {
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'welcomeMessage';
    welcomeMessage.textContent = `Welcome Back, ${firstName}!`;
    return welcomeMessage;
}

function createUserSection(user) {
    const divUser = document.createElement('div');
    divUser.className = 'divUser';

    const divInfo = document.createElement('div');
    divInfo.className = 'divInfo';

    // Logout button
    const logout = document.createElement('div');
    logout.id = 'logout';
    logout.className = 'logout';
    logout.textContent = 'Logout';
    divInfo.appendChild(logout);

    // Name display
    const divName = document.createElement('div');
    divName.className = 'divName';
    const name = document.createElement('h3');
    name.textContent = `${user.firstName} ${user.lastName}`;
    divName.appendChild(name);
    divInfo.appendChild(divName);

    // XP information
    const divxp = document.createElement('div');
    divxp.className = 'divxp';
    
    const lvl = document.createElement('div');
    lvl.textContent = `Level: ${user.lvl}`;
    divxp.appendChild(lvl);

    const totalXP = document.createElement('div');
    totalXP.textContent = formatXP(user.maxXP);
    divxp.appendChild(totalXP);

    divInfo.appendChild(divxp);
    divUser.appendChild(divInfo);

    return divUser;
}

function createAuditSection(user) {
    const divaudit = document.createElement('div');
    divaudit.className = 'divaudit';

    const titleaudit = document.createElement('h4');
    titleaudit.textContent = "Audit Info";
    divaudit.appendChild(titleaudit);

    // XP given
    const XPdone = document.createElement('div');
    XPdone.className = 'XPdone';
    XPdone.innerHTML = `⬆ Gived ${formatXP(user.XPup)}`;
    divaudit.appendChild(XPdone);

    // Audit ratio visualization
    const auditRatioSVG = createAuditRatioSVG(user.XPup, user.XPdown);
    divaudit.appendChild(auditRatioSVG);

    // XP received
    const XPreceived = document.createElement('div');
    XPreceived.className = 'XPreceived';
    XPreceived.innerHTML = `⬇ Received ${formatXP(user.XPdown)}`;
    divaudit.appendChild(XPreceived);

    // Audit ratio
    const ratio = document.createElement('div');
    ratio.innerHTML = `Audit Ratio: ${(user.XPup / user.XPdown).toFixed(1)}`;
    divaudit.appendChild(ratio);

    return divaudit;
}

function createXPGraphSection(user) {
    const divgraph = document.createElement('div');
    divgraph.className = 'divgraph';

    const title = document.createElement('h1');
    title.textContent = "XP Graph";
    divgraph.appendChild(title);

    const svg = createXPGraphSVG(user.listTransaction);
    divgraph.appendChild(svg);

    return divgraph;
}

function createFooter() {
    const footer = document.createElement('div');
    footer.className = 'footer';
    footer.textContent = 'Copyright Projeckt Aqua 2025. All rights reserved.';
    return footer;
}

// Utility functions
function formatXP(xpAmount) {
    return xpAmount >= 1000000 
        ? `XP total: ${(xpAmount / 1000000).toFixed(2)} Mb` 
        : `XP total: ${Math.round(xpAmount / 1000)} kb`;
}

function createAuditRatioSVG(XPup, XPdown) {
    const svgAudit = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    
    const [traceXPup, traceXPdown] = calculateAuditRatioTraces(XPup, XPdown);

    const lineDone = createSVGLine(0, 5, traceXPup * 100, 5, 'white');
    const lineReceived = createSVGLine(0, 30, traceXPdown * 100, 30, 'red');

    svgAudit.appendChild(lineDone);
    svgAudit.appendChild(lineReceived);

    return svgAudit;
}

function calculateAuditRatioTraces(XPup, XPdown) {
    return XPup > XPdown 
        ? [1, XPdown / XPup] 
        : [XPup / XPdown, 1];
}

function createSVGLine(x1, y1, x2, y2, color) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke-width', 20);
    line.setAttribute('stroke', color);
    return line;
}

function createXPGraphSVG(transactions) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', 80);
    svg.setAttribute('height', 50);
    svg.setAttribute('viewBox', "0 0 100 100");

    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', 100);
    bgRect.setAttribute('height', 100);
    bgRect.setAttribute('fill', "white");
    svg.appendChild(bgRect);

    const { firstDate, lastDate, amplitudeDate, maxGraph } = calculateXPGraphParams(transactions);

    // Draw XP progression lines
    let sum = 0;
    for (let i = 1; i < transactions.length; i++) {
        sum += transactions[i].amount;
        const line = createXPProgressionLine(
            transactions, 
            i, 
            firstDate, 
            amplitudeDate, 
            sum, 
            maxGraph
        );
        svg.appendChild(line);
    }

    // Add date and XP axis labels
    svg.appendChild(createDateLegend(firstDate, lastDate));
    svg.appendChild(createXPLegend());

    return svg;
}

function calculateXPGraphParams(transactions) {
    const firstDate = Date.parse(transactions[0].createdAt);
    const lastDate = Date.parse(transactions[transactions.length - 1].createdAt);
    
    const amplitudeDate = new Date(lastDate - firstDate);
    amplitudeDate.setMonth(amplitudeDate.getMonth() + 1);

    const maxGraph = transactions.reduce((acc, t) => acc + t.amount, 0) + 100000;

    return { firstDate, lastDate, amplitudeDate, maxGraph };
}

function createXPProgressionLine(transactions, index, firstDate, amplitudeDate, sum, maxGraph) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    
    line.setAttribute('x1', ((Date.parse(transactions[index].createdAt) - firstDate) * 100) / amplitudeDate);
    const y = (sum * 100) / maxGraph;
    line.setAttribute('y1', 100 - y);
    
    line.setAttribute('x2', ((Date.parse(transactions[index - 1].createdAt) - firstDate) * 100) / amplitudeDate);
    const yPreview = ((sum - transactions[index].amount) * 100) / maxGraph;
    line.setAttribute('y2', 100 - yPreview);
    
    line.setAttribute('stroke', 'gold');
    
    return line;
}

function createDateLegend(firstDate, lastDate) {
    const dataFirstDate = new Date(firstDate);
    const dataLastDate = new Date(lastDate);

    const titleLineLegendex = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleLineLegendex.setAttribute('x', 15);
    titleLineLegendex.setAttribute('y', 99);
    titleLineLegendex.setAttribute('fill', 'black');
    titleLineLegendex.setAttribute('font-size', 4);
    titleLineLegendex.textContent = `Dates: ${formatDate(dataFirstDate)} to ${formatDate(dataLastDate)}`;

    return titleLineLegendex;
}

function formatDate(date) {
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth()).padStart(2, '0')}/${date.getFullYear()}`;
}

function createXPLegend() {
    const titleLineLegendey = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleLineLegendey.setAttribute('x', 1);
    titleLineLegendey.setAttribute('y', 55);
    titleLineLegendey.setAttribute('fill', 'black');
    titleLineLegendey.setAttribute('font-size', 4);
    titleLineLegendey.setAttribute('transform', "rotate(-90 4,55)");
    titleLineLegendey.textContent = "Xp you received";

    return titleLineLegendey;
}

// Initialize the application
renderHomePage();