# Google Sheet Analytics & Dashboard Setup for LocalPDF

This script turns your Google Sheet into an automated real-time analytics backend and dashboard for **LocalPDF**, recording every visitor, demographics, tool usage, and support tickets with zero external servers.

---

## 1. Copy-Paste Google Apps Script Code

In your Google Sheet, click **Extensions** > **Apps Script**, delete any existing content in `Code.gs`, and paste the following code:

```javascript
/**
 * LocalPDF Unified Webhook & Analytics Dashboard
 * Handles:
 * 1. User Support Tickets -> Appends to 'Tickets' tab
 * 2. Visitor Analytics & Tool Usage Logs -> Appends to 'Usage_Logs' tab
 * 3. Auto-builds and updates a live executive 'Dashboard' tab
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'No payload' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (payload.type === 'ANALYTICS_EVENT') {
      handleAnalyticsEvent(ss, payload);
    } else {
      handleSupportTicket(ss, payload);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'online',
    service: 'LocalPDF Analytics & Support API',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle incoming visitor analytics & tool execution
 */
function handleAnalyticsEvent(ss, data) {
  var sheet = ss.getSheetByName('Usage_Logs');
  if (!sheet) {
    sheet = ss.insertSheet('Usage_Logs');
    var headers = [
      'Timestamp',
      'Date',
      'Visitor ID',
      'Session ID',
      'Event Type',
      'Tool ID',
      'Tool Name',
      'Device',
      'OS',
      'Browser',
      'Timezone',
      'Language',
      'Screen',
      'Referrer',
      'File Count',
      'Size (KB)',
      'Status'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#1e293b')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.date || new Date().toISOString().slice(0, 10),
    data.visitorId || 'anon',
    data.sessionId || 'anon',
    data.eventType || 'PAGE_VIEW',
    data.toolId || 'overview',
    data.toolName || 'Website Landing',
    data.device || 'Desktop',
    data.os || 'Unknown',
    data.browser || 'Unknown',
    data.timezone || 'UTC',
    data.language || 'en',
    data.screenResolution || '',
    data.referrer || 'Direct',
    data.fileCount || 0,
    data.fileSizeKb || 0,
    data.status || 'success'
  ]);

  // Ensure Dashboard exists
  ensureDashboardExists(ss);
}

/**
 * Handle user support ticket submission
 */
function handleSupportTicket(ss, data) {
  var sheet = ss.getSheetByName('Tickets');
  if (!sheet) {
    sheet = ss.insertSheet('Tickets');
    var headers = [
      'Timestamp',
      'Ticket ID',
      'Name',
      'Email',
      'Category',
      'Subject',
      'Message',
      'Status'
    ];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setBackground('#0f172a')
      .setFontColor('#ffffff')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.id || ('TICK-' + Date.now()),
    data.name || 'Anonymous',
    data.email || 'N/A',
    data.category || 'General',
    data.subject || 'No Subject',
    data.message || '',
    data.status || 'open'
  ]);
}

/**
 * Automatically set up the live Dashboard tab with dynamic formulas
 */
function ensureDashboardExists(ss) {
  var dash = ss.getSheetByName('Dashboard');
  if (dash) return; // Already exists

  dash = ss.insertSheet('Dashboard', 0); // Put dashboard as first tab

  // 1. Title Banner
  dash.getRange('A1:J1').merge();
  dash.getRange('A1').setValue('📊 LocalPDF Live Analytics & Demographics Dashboard');
  dash.getRange('A1').setBackground('#0f172a').setFontColor('#ffffff').setFontSize(16).setFontWeight('bold');
  dash.setRowHeight(1, 45);

  // 2. KPI Cards Row
  // Total Visitors
  dash.getRange('B3:C3').merge().setValue('UNIQUE VISITORS').setBackground('#f1f5f9').setFontWeight('bold').setFontSize(9);
  dash.getRange('B4:C4').merge().setFormula('=IFERROR(COUNTUNIQUE(Usage_Logs!C2:C), 0)').setBackground('#e2e8f0').setFontSize(18).setFontWeight('bold');

  // Total Page Views
  dash.getRange('D3:E3').merge().setValue('TOTAL PAGE VIEWS').setBackground('#f1f5f9').setFontWeight('bold').setFontSize(9);
  dash.getRange('D4:E4').merge().setFormula('=IFERROR(COUNTIF(Usage_Logs!E2:E, "PAGE_VIEW"), 0)').setBackground('#e2e8f0').setFontSize(18).setFontWeight('bold');

  // Total Tools Used
  dash.getRange('F3:G3').merge().setValue('TOOLS EXECUTED').setBackground('#ecfdf5').setFontWeight('bold').setFontSize(9);
  dash.getRange('F4:G4').merge().setFormula('=IFERROR(COUNTIF(Usage_Logs!E2:E, "TOOL_USE"), 0)').setBackground('#d1fae5').setFontSize(18).setFontWeight('bold');

  // Support Tickets
  dash.getRange('H3:I3').merge().setValue('SUPPORT TICKETS').setBackground('#fef2f2').setFontWeight('bold').setFontSize(9);
  dash.getRange('H4:I4').merge().setFormula('=IFERROR(COUNTA(Tickets!A2:A), 0)').setBackground('#fee2e2').setFontSize(18).setFontWeight('bold');

  // 3. Section Headers
  dash.getRange('B7:D7').merge().setValue('🛠️ Most Popular Tools').setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
  dash.getRange('B8').setFormula('=IFERROR(QUERY(Usage_Logs!E2:G, "SELECT G, COUNT(E) WHERE E=\'TOOL_USE\' GROUP BY G ORDER BY COUNT(E) DESC LIMIT 10 LABEL G \'Tool Name\', COUNT(E) \'Total Uses\'"), "No tool usage data yet")');

  dash.getRange('F7:G7').merge().setValue('📱 Device Breakdown').setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
  dash.getRange('F8').setFormula('=IFERROR(QUERY(Usage_Logs!E2:H, "SELECT H, COUNT(E) WHERE H IS NOT NULL GROUP BY H ORDER BY COUNT(E) DESC LABEL H \'Device\', COUNT(E) \'Count\'"), "No device data yet")');

  dash.getRange('I7:J7').merge().setValue('🌍 Demographics / Timezones').setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
  dash.getRange('I8').setFormula('=IFERROR(QUERY(Usage_Logs!E2:K, "SELECT K, COUNT(E) WHERE K IS NOT NULL GROUP BY K ORDER BY COUNT(E) DESC LIMIT 10 LABEL K \'Timezone / Region\', COUNT(E) \'Visits\'"), "No timezone data yet")');

  // OS Breakdown
  dash.getRange('F15:G15').merge().setValue('💻 Operating System').setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
  dash.getRange('F16').setFormula('=IFERROR(QUERY(Usage_Logs!E2:I, "SELECT I, COUNT(E) WHERE I IS NOT NULL GROUP BY I ORDER BY COUNT(E) DESC LABEL I \'OS\', COUNT(E) \'Count\'"), "No OS data yet")');

  // Daily Trend
  dash.getRange('B20:D20').merge().setValue('📅 Daily Activity Trend').setFontWeight('bold').setBackground('#334155').setFontColor('#ffffff');
  dash.getRange('B21').setFormula('=IFERROR(QUERY(Usage_Logs!B2:E, "SELECT B, COUNT(E) WHERE B IS NOT NULL GROUP BY B ORDER BY B DESC LIMIT 14 LABEL B \'Date\', COUNT(E) \'Events\'"), "No daily activity yet")');

  SpreadsheetApp.flush();
}

/**
 * Custom Menu in Google Sheet to regenerate the Dashboard anytime
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('LocalPDF')
    .addItem('📊 Setup / Refresh Dashboard', 'manualCreateDashboard')
    .addToUi();
}

function manualCreateDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var existing = ss.getSheetByName('Dashboard');
  if (existing) {
    ss.deleteSheet(existing);
  }
  ensureDashboardExists(ss);
  SpreadsheetApp.getUi().alert('Dashboard tab generated successfully!');
}
```

---

## 2. Deploy Steps in Google Sheets

1. Open your Google Sheet.
2. Go to **Extensions** > **Apps Script**.
3. Paste the code above into `Code.gs`.
4. Click **Deploy** > **Manage deployments**.
5. Click the **Pencil (Edit)** icon on your active deployment (or **New deployment** > Web app):
   - **Execute as**: *Me*
   - **Who has access**: *Anyone*
6. Click **Deploy**.
7. If the URL changed, update `GOOGLE_SHEET_WEBHOOK_URL` in `src/lib/sheetWebhook.ts`. (If you updated the existing deployment via "New version", the URL remains the same!)
