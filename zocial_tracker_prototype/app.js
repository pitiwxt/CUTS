// Mock Data representing the Zocial Tracker records
const postsData = [
    { id: 'IG_2601', platform: 'Instagram', type: 'Reel', reach: 4500, engage: 900, er: 20.0, vs: 4.2, source: 'Meta API', campaign: 'Recruiter-2026', shares: 189 },
    { id: 'TT_2602', platform: 'TikTok', type: 'Video', reach: 18200, engage: 2730, er: 15.0, vs: 5.1, source: 'Gemini Vision', campaign: 'Recruiter-2026', shares: 928 },
    { id: 'FB_2603', platform: 'Facebook', type: 'Image', reach: 1100, engage: 55, er: 5.0, vs: 0.3, source: 'Playwright MCP', campaign: 'Workshop-AI', shares: 3 },
    { id: 'TT_2605', platform: 'TikTok', type: 'Reel', reach: 9500, engage: 1710, er: 18.0, vs: 4.8, source: 'Apify Scraper', campaign: 'Recruiter-2026', shares: 456 }
];

// Mock Finance Data from OCRchat (Syncing campaign budgets)
const financeData = {
    'Recruiter-2026': { spend: 1950, name: 'แคมเปญรับสมัครสมาชิกใหม่ 2026' },
    'Workshop-AI': { spend: 3200, name: 'แคมเปญโปรโมตเวิร์กชอปเทคโนโลยี AI' }
};

// Global variables
let activeFilter = 'all';
let analyticsChart = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    renderTable();
    calculateHeaderStats();
    initializeChart();
    setupEventListeners();
});

// Calculate statistics for header cards
function calculateHeaderStats() {
    const filtered = activeFilter === 'all' 
        ? postsData 
        : postsData.filter(p => p.campaign === activeFilter);
        
    const totalReach = filtered.reduce((sum, p) => sum + p.reach, 0);
    const totalEngage = filtered.reduce((sum, p) => sum + p.engage, 0);
    const avgER = totalReach > 0 ? ((totalEngage / totalReach) * 100).toFixed(2) : '0.00';
    
    document.getElementById('stat-total-reach').textContent = totalReach.toLocaleString();
    document.getElementById('stat-total-engage').textContent = totalEngage.toLocaleString();
    document.getElementById('stat-avg-er').textContent = `${avgER}%`;
}

// Render data table
function renderTable() {
    const tableBody = document.getElementById('table-body');
    tableBody.innerHTML = '';
    
    const filtered = activeFilter === 'all' 
        ? postsData 
        : postsData.filter(p => p.campaign === activeFilter);
        
    filtered.forEach(p => {
        const row = document.createElement('tr');
        
        // Setup Platform Badge
        let platformClass = 'badge-ig';
        if (p.platform === 'TikTok') platformClass = 'badge-tt';
        if (p.platform === 'Facebook') platformClass = 'badge-fb';
        
        // Setup Data Source Logo Badges matching LaTeX styling
        let sourceBadgeColor = '#FF2E00'; // badgen8n
        let sourceBg = 'rgba(255, 46, 0, 0.1)';
        if (p.source.includes('API')) { sourceBadgeColor = '#0668E1'; sourceBg = 'rgba(6, 104, 225, 0.1)'; }
        if (p.source.includes('Vision') || p.source.includes('Gemini')) { sourceBadgeColor = '#8E7CC3'; sourceBg = 'rgba(142, 124, 195, 0.1)'; }
        if (p.source.includes('Playwright') || p.source.includes('MCP')) { sourceBadgeColor = '#2E8B57'; sourceBg = 'rgba(46, 139, 87, 0.1)'; }
        if (p.source.includes('Apify') || p.source.includes('Scraper')) { sourceBadgeColor = '#FF6B6B'; sourceBg = 'rgba(255, 107, 107, 0.1)'; }
        
        row.innerHTML = `
            <td><strong>${p.id}</strong></td>
            <td><span class="badge-row ${platformClass}">${p.platform}</span></td>
            <td>${p.type}</td>
            <td>${p.reach.toLocaleString()}</td>
            <td>${p.engage.toLocaleString()}</td>
            <td style="color: var(--chula-pink); font-weight: 600;">${p.er.toFixed(1)}%</td>
            <td>${p.vs.toFixed(1)}%</td>
            <td>
                <span class="logo-badge" style="color: ${sourceBadgeColor}; background: ${sourceBg}; border: 1px solid ${sourceBadgeColor}40;">
                    ${p.source}
                </span>
            </td>
            <td><span class="tech-tag" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border-glass); color: var(--muted-text);">${p.campaign}</span></td>
        `;
        tableBody.appendChild(row);
    });
}

// Initialize Chart.js
function initializeChart() {
    const ctx = document.getElementById('analyticsChart').getContext('2d');
    
    // Gradient definitions for premium looks
    const reachGradient = ctx.createLinearGradient(0, 0, 0, 300);
    reachGradient.addColorStop(0, 'rgba(26, 54, 93, 0.8)');
    reachGradient.addColorStop(1, 'rgba(26, 54, 93, 0.2)');
    
    const engageGradient = ctx.createLinearGradient(0, 0, 0, 300);
    engageGradient.addColorStop(0, 'rgba(184, 29, 103, 0.8)');
    engageGradient.addColorStop(1, 'rgba(184, 29, 103, 0.2)');
    
    const filtered = activeFilter === 'all' 
        ? postsData 
        : postsData.filter(p => p.campaign === activeFilter);
        
    const labels = filtered.map(p => p.id);
    const reachData = filtered.map(p => p.reach);
    const engageData = filtered.map(p => p.engage);
    const erData = filtered.map(p => p.er);

    analyticsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Reach',
                    data: reachData,
                    backgroundColor: reachGradient,
                    borderColor: '#1A365D',
                    borderWidth: 1.5,
                    borderRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Engagement (เอนเกจ)',
                    data: engageData,
                    backgroundColor: engageGradient,
                    borderColor: '#B81D67',
                    borderWidth: 1.5,
                    borderRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'ER (%)',
                    data: erData,
                    type: 'line',
                    borderColor: '#F2C811',
                    borderWidth: 3,
                    pointBackgroundColor: '#F2C811',
                    fill: false,
                    yAxisID: 'y1',
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: '#A0AEC0',
                        font: { family: 'Inter, Sarabun' }
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#A0AEC0', font: { family: 'Inter, Sarabun' } }
                },
                y: {
                    position: 'left',
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#A0AEC0' },
                    title: { display: true, text: 'Reach / Engagement (ครั้ง)', color: '#A0AEC0' }
                },
                y1: {
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#F2C811' },
                    title: { display: true, text: 'Engagement Rate (%)', color: '#F2C811' }
                }
            }
        }
    });
}

// Update Chart Data based on filters
function updateChart() {
    const filtered = activeFilter === 'all' 
        ? postsData 
        : postsData.filter(p => p.campaign === activeFilter);
        
    analyticsChart.data.labels = filtered.map(p => p.id);
    analyticsChart.data.datasets[0].data = filtered.map(p => p.reach);
    analyticsChart.data.datasets[1].data = filtered.map(p => p.engage);
    analyticsChart.data.datasets[2].data = filtered.map(p => p.er);
    analyticsChart.update();
}

// Setup Interaction Handlers
function setupEventListeners() {
    // Campaign Filter Dropdown
    document.getElementById('filter-campaign').addEventListener('change', (e) => {
        activeFilter = e.target.value;
        renderTable();
        calculateHeaderStats();
        updateChart();
    });

    // Run Daily Simulation Button
    document.getElementById('btn-run-simulation').addEventListener('click', runSimulation);
    document.getElementById('btn-reset-simulation').addEventListener('click', resetSimulation);

    // Chatbot Submit
    document.getElementById('btn-send-chat').addEventListener('click', handleChatSubmit);
    document.getElementById('chat-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleChatSubmit();
    });

    // Preset Buttons Click
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const query = e.target.getAttribute('data-query');
            addChatMessage(query, 'user');
            processBotResponse(query);
        });
    });
}

// Log line helper for Terminal
function logToTerminal(message, type = 'info') {
    const term = document.getElementById('terminal-log');
    const line = document.createElement('span');
    line.className = `log-line ${type === 'muted' ? 'text-muted' : type === 'warn' ? 'text-warn' : type === 'error' ? 'text-error' : ''}`;
    
    // Add current time in format [HH:MM:SS]
    const now = new Date();
    const timeStr = `[${now.toTimeString().split(' ')[0]}]`;
    
    line.innerHTML = `<span style="color: #63b3ed">${timeStr}</span> ${message}`;
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
}

// Reset Pipeline GUI and Console
function resetSimulation() {
    const nodes = ['step-api', 'step-vision', 'step-mcp', 'step-apify'];
    const lines = ['line-1', 'line-2', 'line-3'];
    
    nodes.forEach(n => {
        const node = document.getElementById(n);
        node.className = 'step-node';
        const status = document.getElementById(`status-${n.split('-')[1]}`);
        status.textContent = 'Standby';
        status.className = 'node-status status-pending';
    });
    
    lines.forEach(l => {
        document.getElementById(l).className = 'flow-line';
    });

    // Make API active standby
    document.getElementById('step-api').className = 'step-node active';
    document.getElementById('status-api').textContent = 'Ready';
    document.getElementById('status-api').className = 'node-status status-success';

    document.getElementById('terminal-log').innerHTML = '<span class="log-line text-muted">[system] Ready to run daily workflow at 02:00 AM...</span>';
}

// Fallback Pipeline Simulation Algorithm
function runSimulation() {
    resetSimulation();
    
    const btn = document.getElementById('btn-run-simulation');
    btn.disabled = true;
    btn.textContent = '⏳ กำลังดึงข้อมูล...';
    
    let delay = 300;
    
    // Stage 1: Initiating cron
    setTimeout(() => {
        logToTerminal(' n8n Daily Workflow triggered at 02:00 AM.', 'muted');
        logToTerminal('🔌 Fetching active content list from operational DB...');
    }, delay);
    
    // Stage 2: Processing Instagram API
    delay += 1000;
    setTimeout(() => {
        logToTerminal('✨ Processing Post IG_2601 (Instagram Reel)...');
        logToTerminal('⚡ Calling Meta Graph API endpoints...');
    }, delay);
    
    delay += 1200;
    setTimeout(() => {
        logToTerminal('✅ Meta API Success! IG_2601 data saved: Reach=4,500, Engage=900 (likes=820, shares=35, saves=5, comments=40)');
    }, delay);

    // Stage 3: Processing TikTok API TT_2602 - FAILS (Rate Limit)
    delay += 1500;
    setTimeout(() => {
        logToTerminal('✨ Processing Post TT_2602 (TikTok Video)...', 'muted');
        logToTerminal('⚡ Querying TikTok API endpoints...', 'muted');
    }, delay);

    delay += 1000;
    setTimeout(() => {
        logToTerminal('❌ TikTok API Error: Rate Limit Exceeded (HTTP 429)!', 'error');
        document.getElementById('status-api').textContent = 'Warning';
        document.getElementById('status-api').className = 'node-status status-failed';
        document.getElementById('line-1').className = 'flow-line active';
        document.getElementById('step-vision').className = 'step-node active';
        document.getElementById('status-vision').textContent = 'Running';
        document.getElementById('status-vision').className = 'node-status status-running';
        
        logToTerminal('⚠️ [Fallback Triggered] Switching to Layer 2a (Playwright + Gemini Vision)...', 'warn');
    }, delay);

    delay += 1500;
    setTimeout(() => {
        logToTerminal('🤖 Launching Playwright browser virtual instance in headless mode...', 'muted');
        logToTerminal('🧭 Navigating to TikTok Creator Analytics page...');
        logToTerminal('📸 Taking screen capture of metrics dashboard canvas...', 'muted');
    }, delay);

    delay += 1800;
    setTimeout(() => {
        logToTerminal('🧠 Forwarding screenshot buffer to Gemini 1.5 Flash Vision...');
        logToTerminal('📝 Parsing Gemini OCR structured JSON output...');
    }, delay);

    delay += 1500;
    setTimeout(() => {
        logToTerminal('✅ Gemini Vision extraction successful! TT_2602 data: Reach=18,200, Engage=2,730 (likes=1800, shares=928, saves=2)');
        document.getElementById('step-vision').className = 'step-node active-success';
        document.getElementById('status-vision').textContent = 'Success';
        document.getElementById('status-vision').className = 'node-status status-success';
    }, delay);

    // Stage 4: Processing FB_2603 - API FAILS (Auth Error)
    delay += 1800;
    setTimeout(() => {
        logToTerminal('✨ Processing Post FB_2603 (Facebook Image)...', 'muted');
        logToTerminal('⚡ Calling Facebook Graph API...', 'muted');
    }, delay);

    delay += 1000;
    setTimeout(() => {
        logToTerminal('❌ Meta API Auth Error: Access token expired/scope revoked!', 'error');
        document.getElementById('line-2').className = 'flow-line active';
        document.getElementById('step-mcp').className = 'step-node active';
        document.getElementById('status-mcp').textContent = 'Running';
        document.getElementById('status-mcp').className = 'node-status status-running';
        
        logToTerminal('⚠️ [Fallback Triggered] Switching to Layer 2b (AI Agent + MCP Browser Control)...', 'warn');
    }, delay);

    delay += 1500;
    setTimeout(() => {
        logToTerminal('🔗 Connecting to Discord Model Context Protocol (MCP) server...', 'muted');
        logToTerminal('🤖 Agent running command: "Open browser, log in to FB Page Manager, copy stats of Post FB_2603"');
    }, delay);

    delay += 1800;
    setTimeout(() => {
        logToTerminal('✅ AI Agent scraped stats successfully! FB_2603 data: Reach=1,100, Engage=55 (likes=52, comments=3)');
        document.getElementById('step-mcp').className = 'step-node active-success';
        document.getElementById('status-mcp').textContent = 'Success';
        document.getElementById('status-mcp').className = 'node-status status-success';
    }, delay);

    // Stage 5: Processing TT_2605 - API Fails, Fallback to Apify
    delay += 1800;
    setTimeout(() => {
        logToTerminal('✨ Processing Post TT_2605 (TikTok Reel)...', 'muted');
        logToTerminal('⚡ Calling TikTok API endpoints...', 'muted');
    }, delay);

    delay += 1000;
    setTimeout(() => {
        logToTerminal('❌ API Connection timed out after 10000ms!', 'error');
        document.getElementById('line-3').className = 'flow-line active';
        document.getElementById('step-apify').className = 'step-node active';
        document.getElementById('status-apify').textContent = 'Running';
        document.getElementById('status-apify').className = 'node-status status-running';
        
        logToTerminal('⚠️ [Fallback Triggered] Switching to Layer 3 (Apify Public Web Scraper)...', 'warn');
    }, delay);

    delay += 1500;
    setTimeout(() => {
        logToTerminal('🕷️ Spawning Apify TikTok Scraper Bot instance...');
        logToTerminal('🌐 Scanning public video metadata of post TT_2605...');
    }, delay);

    delay += 1500;
    setTimeout(() => {
        logToTerminal('✅ Apify Bot Success! TT_2605 data: Reach=9,500, Engage=1,710 (likes=1254, shares=456)');
        document.getElementById('step-apify').className = 'step-node active-success';
        document.getElementById('status-apify').textContent = 'Success';
        document.getElementById('status-apify').className = 'node-status status-success';
    }, delay);

    // Stage 6: Database Sync and Finish
    delay += 1500;
    setTimeout(() => {
        logToTerminal('💾 Saving all pulled content metrics to Google Sheets (Operational Layer)...', 'muted');
        logToTerminal('⚡ Syncing Sheets with Supabase PostgreSQL (Analytics Layer)...');
    }, delay);

    delay += 1200;
    setTimeout(() => {
        logToTerminal('🎉 SUCCESS: Daily workflow execution completed. Database synced successfully!');
        
        btn.disabled = false;
        btn.textContent = '⚡ เริ่มจำลองการดึงสถิติประจำวัน';
    }, delay);
}

// Chatbot messages helper
function addChatMessage(message, sender) {
    const chatBox = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-message ${sender}`;
    
    const avatarTxt = sender === 'bot' ? 'AI' : 'Me';
    msgDiv.innerHTML = `
        <div class="avatar">${avatarTxt}</div>
        <div class="message-content">
            <p>${message}</p>
        </div>
    `;
    
    chatBox.appendChild(msgDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function handleChatSubmit() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    addChatMessage(text, 'user');
    input.value = '';
    
    // Simulate AI response delay
    setTimeout(() => {
        processBotResponse(text);
    }, 600);
}

// Chatbot Response Router
function processBotResponse(query) {
    let response = '';
    
    // Normalize string for keyword matching
    const q = query.toLowerCase();
    
    if (q.includes('สรุปแคมเปญ recruiter-2026') || q.includes('recruiter-2026') || q.includes('สรุป recruiter')) {
        const cBudget = financeData['Recruiter-2026'].spend;
        const posts = postsData.filter(p => p.campaign === 'Recruiter-2026');
        const totalReach = posts.reduce((sum, p) => sum + p.reach, 0);
        const totalEngage = posts.reduce((sum, p) => sum + p.engage, 0);
        
        const cpr = (cBudget / totalReach).toFixed(2);
        const cpe = (cBudget / totalEngage).toFixed(2);
        const avgER = ((totalEngage / totalReach) * 100).toFixed(2);
        
        response = `
            <strong>📊 รายงานประสิทธิภาพแคมเปญ: Recruiter-2026 (รับสมัครสมาชิกใหม่ 2026)</strong><br><br>
            • <strong>ยอดงบประมาณที่ใช้จ่าย (จาก OCRchat):</strong> ${cBudget.toLocaleString()} บาท<br>
            • <strong>ยอดผู้ชมรวม (Total Reach):</strong> ${totalReach.toLocaleString()} ครั้ง<br>
            • <strong>ยอดเอนเกจรวม (Total Engage):</strong> ${totalEngage.toLocaleString()} ครั้ง<br>
            • <strong>อัตราเอนเกจเฉลี่ย (Avg. ER):</strong> ${avgER}%<br><br>
            <strong>💰 การประเมินผลตอบแทน (Digital Marketing ROI):</strong><br>
            • <strong>ต้นทุนต่อยอด Reach (CPR):</strong> ${cpr} บาท ต่อการ Reach 1 ครั้ง<br>
            • <strong>ต้นทุนต่อเอนเกจ (CPE):</strong> ${cpe} บาท ต่อ 1 เอนเกจ<br><br>
            💡 <em>สรุปกลยุทธ์: แคมเปญนี้มีประสิทธิภาพสูงมาก (เอนเกจละ 0.54 บาท) แนะนำให้ใช้โครงสร้างแคมเปญแบบเดิมนี้สำหรับการรับสมัครครั้งถัดไปครับ</em>
        `;
    } 
    else if (q.includes('คุ้มค่า') || q.includes('คุ้มที่สุด') || q.includes('cpr') || q.includes('cpe')) {
        // Compare Recruiter vs Workshop
        const postsRecruiter = postsData.filter(p => p.campaign === 'Recruiter-2026');
        const reachRecruiter = postsRecruiter.reduce((sum, p) => sum + p.reach, 0);
        const engageRecruiter = postsRecruiter.reduce((sum, p) => sum + p.engage, 0);
        const spendRecruiter = financeData['Recruiter-2026'].spend;
        const cpeRecruiter = (spendRecruiter / engageRecruiter).toFixed(2);
        const cprRecruiter = (spendRecruiter / reachRecruiter).toFixed(2);

        const postsWorkshop = postsData.filter(p => p.campaign === 'Workshop-AI');
        const reachWorkshop = postsWorkshop.reduce((sum, p) => sum + p.reach, 0);
        const engageWorkshop = postsWorkshop.reduce((sum, p) => sum + p.engage, 0);
        const spendWorkshop = financeData['Workshop-AI'].spend;
        const cpeWorkshop = (spendWorkshop / engageWorkshop).toFixed(2);
        const cprWorkshop = (spendWorkshop / reachWorkshop).toFixed(2);

        response = `
            <strong>💰 รายงานวิเคราะห์ความคุ้มค่าข้ามแผนก (Campaign ROI Comparison)</strong><br><br>
            จากการจับคู่ข้อมูลการเงินจาก <strong>OCRchat</strong> และข้อมูลสถิติคอนเทนต์จาก <strong>Zocial Tracker</strong> สรุปได้ดังนี้ครับ:<br><br>
            
            <strong>1. แคมเปญ Recruiter-2026 (รับสมัครสมาชิก)</strong><br>
            • ค่าใช้จ่าย: ${spendRecruiter.toLocaleString()} บาท<br>
            • CPR (ต้นทุน/Reach): <strong>${cprRecruiter} บาท</strong><br>
            • CPE (ต้นทุน/เอนเกจ): <strong>${cpeRecruiter} บาท</strong><br><br>
            
            <strong>2. แคมเปญ Workshop-AI (โปรโมตเวิร์กชอป)</strong><br>
            • ค่าใช้จ่าย: ${spendWorkshop.toLocaleString()} บาท<br>
            • CPR (ต้นทุน/Reach): <strong>${cprWorkshop} บาท</strong><br>
            • CPE (ต้นทุน/เอนเกจ): <strong>${cpeWorkshop} บาท</strong><br><br>
            
            🏆 <strong>สรุปประสิทธิภาพ:</strong> แคมเปญ <strong>Recruiter-2026 คุ้มค่าที่สุด</strong> เนื่องจากมีอัตราต้นทุนต่อยอด Reach ต่ำกว่าถึง 36 เท่า และต้นทุนต่อเอนเกจ (CPE) ต่ำกว่า 100 เท่า!
        `;
    }
    else if (q.includes('workshop-ai') || q.includes('เวิร์กชอป')) {
        const cBudget = financeData['Workshop-AI'].spend;
        const posts = postsData.filter(p => p.campaign === 'Workshop-AI');
        const totalReach = posts.reduce((sum, p) => sum + p.reach, 0);
        const totalEngage = posts.reduce((sum, p) => sum + p.engage, 0);
        
        const cpr = (cBudget / totalReach).toFixed(2);
        const cpe = (cBudget / totalEngage).toFixed(2);
        
        response = `
            <strong>📊 รายงานประสิทธิภาพแคมเปญ: Workshop-AI</strong><br><br>
            • ยอดเงินที่ใช้จ่าย: ${cBudget.toLocaleString()} บาท<br>
            • ยอดผู้ชมรวม (Reach): ${totalReach.toLocaleString()} ครั้ง<br>
            • ยอดเอนเกจรวม (Engage): ${totalEngage.toLocaleString()} ครั้ง<br>
            • ER (Engagement Rate): 5.00%<br>
            • CPR: ${cpr} บาท | CPE: ${cpe} บาท<br><br>
            ⚠️ <strong>ข้อเสนอแนะสำหรับการปรับปรุง:</strong><br>
            แคมเปญนี้ได้ผลตอบรับต่ำ เนื่องจากใช้เพียงภาพนิ่ง (Static Image) บน Facebook ทำให้ดัชนีชี้วัด CPR/CPE พุ่งสูงผิดปกติ เสนอให้ปรับแผนในแคมเปญเวิร์กชอปถัดไปมาใช้เป็นคลิปวิดีโอสั้น (Reel/TikTok) เพื่อเพิ่ม Reach และยอดเอนเกจแบบเรียลไทม์ครับ
        `;
    }
    else if (q.includes('สูตร') || q.includes('คำนวณ') || q.includes('cpe')) {
        response = `
            <strong>🧮 คำอธิบายสูตรชี้วัดประสิทธิภาพ (KPI Formulas)</strong><br><br>
            • <strong>Engagement Rate (ER) [อัตราเอนเกจ]</strong><br>
            สูตร: <code>ER = ((Likes + Comments + Shares + Saves) / Reach) * 100</code><br>
            ใช้สำหรับวิเคราะห์ความน่าดึงดูดของตัวคอนเทนต์<br><br>
            
            • <strong>Cost per Engagement (CPE) [ต้นทุนต่อเอนเกจ]</strong><br>
            สูตร: <code>CPE = ยอดจ่ายรวม / ยอดรวมของเอนเกจ</code><br>
            ใช้สำหรับวิเคราะห์ความประหยัดและความคุ้มค่าเมื่อเปรียบเทียบกับงบประมาณที่แผนก Finance บันทึกจริงในโครงการ
        `;
    }
    else {
        response = `
            ขออภัยครับ บอทยังไม่พบข้อมูลตรงกับคำค้นหาของคุณ สามารถพิมพ์ตรวจสอบใหม่ได้ตามคำสั่งแนะนำ:<br><br>
            • พิมพ์: <strong>"สรุปแคมเปญ Recruiter-2026"</strong><br>
            • พิมพ์: <strong>"เปรียบเทียบ CPE แคมเปญ"</strong><br>
            • พิมพ์: <strong>"ขอสูตร CPE"</strong>
        `;
    }
    
    addChatMessage(response, 'bot');
}
