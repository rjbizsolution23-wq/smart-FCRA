import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const dashboardHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Smart FCRA Detector - Dashboard</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          background-color: #0b1220;
          color: #f8fbff;
          display: flex;
          height: 900px;
        }
        .sidebar {
          width: 260px;
          background-color: #0a1120;
          border-right: 1px solid #1e293b;
          display: flex;
          flex-direction: column;
          padding: 24px;
          box-sizing: border-box;
        }
        .logo {
          font-size: 18px;
          font-weight: bold;
          color: #0a66ff;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 40px;
        }
        .logo-dot {
          width: 10px;
          height: 10px;
          background-color: #0a66ff;
          border-radius: 50%;
          box-shadow: 0 0 10px #0a66ff;
        }
        .menu-item {
          padding: 12px 16px;
          border-radius: 8px;
          color: #94a3b8;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 8px;
        }
        .menu-item.active {
          background-color: #0d1e3d;
          color: #3b82f6;
          font-weight: 600;
        }
        .menu-item:hover:not(.active) {
          background-color: #1e293b;
          color: #f8fbff;
        }
        .main-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          box-sizing: border-box;
          overflow-y: hidden;
        }
        .topbar {
          height: 70px;
          border-bottom: 1px solid #1e293b;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 40px;
          box-sizing: border-box;
          background-color: #0c1524;
        }
        .user-profile {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 14px;
        }
        .avatar {
          width: 36px;
          height: 36px;
          background: linear-gradient(135deg, #0a66ff, #003b8f);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          color: #ffffff;
        }
        .dashboard-body {
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 24px;
          overflow-y: auto;
          box-sizing: border-box;
        }
        .page-title {
          font-size: 24px;
          font-weight: bold;
          margin: 0;
          color: #ffffff;
        }
        .card-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
        }
        .card {
          background-color: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          padding: 20px;
          box-sizing: border-box;
        }
        .card-label {
          font-size: 12px;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }
        .card-value {
          font-size: 22px;
          font-weight: bold;
          color: #ffffff;
        }
        .card-subtext {
          font-size: 11px;
          color: #10b981;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .section-header {
          font-size: 16px;
          font-weight: 600;
          margin: 20px 0 12px 0;
          color: #3b82f6;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .table-container {
          background-color: #0f172a;
          border: 1px solid #1e293b;
          border-radius: 12px;
          overflow: hidden;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
          font-size: 14px;
        }
        th {
          background-color: #0a1120;
          padding: 16px;
          color: #94a3b8;
          font-weight: 600;
          border-bottom: 1px solid #1e293b;
        }
        td {
          padding: 16px;
          border-bottom: 1px solid #1e293b;
          color: #e2e8f0;
          vertical-align: top;
        }
        tr:last-child td {
          border-bottom: none;
        }
        .badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .badge-danger {
          background-color: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }
        .badge-success {
          background-color: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .action-button {
          background-color: #0a66ff;
          color: #ffffff;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .action-button:hover {
          background-color: #004ecc;
        }
        .footer-branding {
          margin-top: auto;
          font-size: 11px;
          color: #475569;
          text-align: center;
          border-top: 1px solid #1e293b;
          padding-top: 16px;
        }
      </style>
    </head>
    <body>
      <div class="sidebar">
        <div class="logo">
          <div class="logo-dot"></div>
          <span>Smart FCRA Detector</span>
        </div>
        <div class="menu-item">Dashboard</div>
        <div class="menu-item active">Clients & Reports</div>
        <div class="menu-item">Violations Audit</div>
        <div class="menu-item">Document Generator</div>
        <div class="menu-item">Settings</div>
        
        <div class="footer-branding">
          Powered by RJ Business Solutions<br>
          Rick Jefferson, Architect
        </div>
      </div>
      <div class="main-content">
        <div class="topbar">
          <span style="font-size: 14px; color: #94a3b8;">Client Center &gt; Gary A. Branch</span>
          <div class="user-profile">
            <span>Operator: <strong>Gary A. Branch</strong></span>
            <div class="avatar">GB</div>
          </div>
        </div>
        <div class="dashboard-body">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1 class="page-title">Gary A. Branch — Client Workspace</h1>
            <span style="font-size: 12px; color: #64748b;">Build ID: NEL-20260706-948271</span>
          </div>

          <div class="card-grid">
            <div class="card">
              <div class="card-label">Active Client Name</div>
              <div class="card-value" style="font-size: 18px;">Gary A. Branch</div>
              <div class="card-subtext">SSN last-4 & DOB Match 🟢</div>
            </div>
            <div class="card">
              <div class="card-label">Target Bureau</div>
              <div class="card-value">Equifax</div>
              <div class="card-subtext">Address Verified 🟢</div>
            </div>
            <div class="card">
              <div class="card-label">Identified Violations</div>
              <div class="card-value" style="color: #f87171;">1 Critical</div>
              <div class="card-subtext" style="color: #ef4444;">Metro 2 Incomplete Reporting</div>
            </div>
            <div class="card">
              <div class="card-label">Litigation Value Score</div>
              <div class="card-value" style="color: #34d399;">84 / 100</div>
              <div class="card-subtext">Grade A — Strong Case 🟢</div>
            </div>
          </div>

          <div class="section-header">
            <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style="color: #3b82f6;"><path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M7.002 11a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 4.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.555 0 0 1-1.1 0L7.1 4.995z"/></svg>
            <span>Metro 2 & FCRA Compliance Audit</span>
          </div>

          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Creditor Name</th>
                  <th>Account Number</th>
                  <th>Violation Subcategory</th>
                  <th>Severity</th>
                  <th>Audit Evidence</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>CHASE CARD SERVICES</strong></td>
                  <td><code>4412XXXXXXXX1234</code></td>
                  <td>Unpaid Charge-Off Incomplete Reporting</td>
                  <td><span class="badge badge-danger">High</span></td>
                  <td style="font-size: 12px; color: #94a3b8; max-width: 350px; line-height: 1.4;">
                    Equifax is reporting incomplete and inaccurate account information. Equifax is not reporting the scheduled payment amount, the date the account was closed, or the last payment amount...
                  </td>
                  <td>
                    <button class="action-button">Generate 1681i Letter</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  // Start browser
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 900 });
  await page.setContent(dashboardHtml);

  // Wait for rendering
  await page.waitForTimeout(1000);

  // Ensure absolute directory path
  const targetDir = 'C:\\Users\\ricky\\.gemini\\antigravity\\brain\\51c69c51-b321-4a7a-8cd0-63ccbf864a69';
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const outputPath = path.join(targetDir, 'media_render_dashboard.png');
  await page.screenshot({ path: outputPath });

  console.log(`UI Dashboard saved successfully to ${outputPath}`);
  await browser.close();
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
