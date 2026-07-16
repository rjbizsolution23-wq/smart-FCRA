# FCRA Supreme Violation Detector - Integration Guide

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
npm install react react-dom lucide-react
# or
yarn add react react-dom lucide-react
```

### Step 2: Import Main Dashboard

```typescript
import { CreditReportDashboard } from './src/frontend/components/CreditReportDashboard';
import type { CreditReportData } from './src/types';
```

### Step 3: Basic Implementation

```typescript
import React, { useState } from 'react';
import { CreditReportDashboard } from './components/CreditReportDashboard';

function App() {
  const [language, setLanguage] = useState<'en' | 'es'>('en');
  const [reportData, setReportData] = useState<CreditReportData | null>(null);

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('creditReport', file);
    
    const response = await fetch('/api/violation-analysis', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    setReportData(data);
  };

  if (!reportData) {
    return (
      <div>
        <h1>Upload Credit Report</h1>
        <input type="file" accept=".pdf" onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFileUpload(e.target.files[0]);
          }
        }} />
      </div>
    );
  }

  return (
    <CreditReportDashboard
      reportData={reportData}
      language={language}
      onLanguageChange={setLanguage}
      onGenerateDocument={(docType) => {
        // Call document generation API
        fetch('/api/documents/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ docType, violations: reportData.violations })
        });
      }}
      onExportData={(format) => {
        // Export data in requested format
        if (format === 'JSON') {
          const blob = new Blob([JSON.stringify(reportData, null, 2)], 
                                 { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'credit-report.json';
          a.click();
        }
      }}
    />
  );
}

export default App;
```

---

## 🔗 Backend Integration

### API Endpoints Required

#### 1. **Upload & Analyze Credit Report**
```
POST /api/violation-analysis
Content-Type: multipart/form-data

Request Body:
- creditReport: File (PDF)

Response:
{
  "accounts": [...],
  "violations": [...],
  "damages": {...},
  "litigationScore": {...},
  "personalInfo": {...},
  "inquiries": [...],
  "publicRecords": [...],
  "timelineEvents": [...]
}
```

**Backend Implementation (Node.js/Express):**
```typescript
import { Router } from 'express';
import multer from 'multer';
import { analyzeCreditReport } from './engine/orchestrator';

const router = Router();
const upload = multer({ dest: 'uploads/' });

router.post('/violation-analysis', upload.single('creditReport'), async (req, res) => {
  try {
    const filePath = req.file.path;
    
    // 1. Extract text from PDF
    const rawText = await extractPdfText(filePath);
    
    // 2. Parse credit report
    const parsedReport = await parseCreditReport(rawText);
    
    // 3. Run violation detection
    const result = await analyzeCreditReport(parsedReport);
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

#### 2. **Generate Legal Documents**
```
POST /api/documents/generate
Content-Type: application/json

Request Body:
{
  "docType": "federal-complaint" | "cfpb-complaint" | "dispute-letter" | ...,
  "violations": [...],
  "personalInfo": {...},
  "language": "en" | "es"
}

Response:
{
  "documentUrl": "https://...",
  "documentType": "pdf",
  "fileName": "federal-complaint-2024-01-20.pdf"
}
```

**Backend Implementation:**
```typescript
router.post('/documents/generate', async (req, res) => {
  const { docType, violations, personalInfo, language } = req.body;
  
  let documentContent: string;
  
  switch (docType) {
    case 'federal-complaint':
      documentContent = await generateFederalComplaint({
        violations,
        personalInfo,
        language
      });
      break;
    case 'cfpb-complaint':
      documentContent = await generateCFPBComplaint({
        violations,
        personalInfo,
        language
      });
      break;
    // ... other document types
  }
  
  // Convert to PDF
  const pdfBuffer = await convertToPdf(documentContent);
  
  // Upload to storage
  const url = await uploadToStorage(pdfBuffer, `${docType}-${Date.now()}.pdf`);
  
  res.json({
    documentUrl: url,
    documentType: 'pdf',
    fileName: `${docType}-${new Date().toISOString().split('T')[0]}.pdf`
  });
});
```

#### 3. **Export Data**
```
GET /api/export?format=json|csv|pdf
Authorization: Bearer {token}

Response:
Binary file download
```

---

## 📦 Database Schema Integration

### PostgreSQL Tables

**See `src/database/schema.sql` for complete schema**

Key tables:
- `users` - User accounts
- `credit_reports` - Uploaded reports
- `accounts` - Credit accounts
- `violations` - Detected violations
- `damages` - Damages calculations
- `documents` - Generated documents
- `disputes` - Dispute tracking

### Example Query - Load Dashboard Data

```sql
-- Load complete dashboard data for a user
WITH user_violations AS (
  SELECT v.*, a.account_name, a.creditor_name, a.bureau
  FROM violations v
  JOIN accounts a ON v.account_id = a.account_id
  WHERE a.credit_report_id = $1
),
user_damages AS (
  SELECT 
    SUM(fcra_statutory + fcra_actual + fcra_punitive) as fcra_total,
    SUM(fdcpa_statutory + fdcpa_actual) as fdcpa_total,
    SUM(ecoa_statutory + ecoa_punitive) as ecoa_total,
    SUM(state_law_total) as state_total
  FROM damages
  WHERE violation_id IN (SELECT violation_id FROM user_violations)
)
SELECT 
  (SELECT json_agg(row_to_json(a)) FROM accounts a WHERE credit_report_id = $1) as accounts,
  (SELECT json_agg(row_to_json(v)) FROM user_violations v) as violations,
  (SELECT row_to_json(d) FROM user_damages d) as damages,
  (SELECT row_to_json(l) FROM litigation_scores l WHERE credit_report_id = $1) as litigation_score
```

---

## 🎨 Styling Integration

### Tailwind CSS Configuration

Add to `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'bureau-experian': '#3B82F6',
        'bureau-equifax': '#EF4444',
        'bureau-transunion': '#10B981',
        'severity-critical': '#DC2626',
        'severity-high': '#F59E0B',
        'severity-medium': '#EAB308',
        'severity-low': '#3B82F6',
        'status-current': '#10B981',
        'status-late-30': '#EAB308',
        'status-late-60': '#F59E0B',
        'status-late-90': '#EF4444',
        'status-chargeoff': '#DC2626',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

### Custom CSS

Add to `globals.css`:

```css
/* Credit Report Dashboard Styles */
.credit-report-dashboard {
  @apply min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900;
}

/* Custom scrollbar */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  @apply bg-slate-800/30 rounded;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-600/50 rounded hover:bg-slate-500/70;
}

/* Payment history bars */
.payment-bar {
  @apply w-3 h-12 rounded transition-all hover:scale-110;
}

.payment-bar-current { @apply bg-green-500; }
.payment-bar-late-30 { @apply bg-yellow-500; }
.payment-bar-late-60 { @apply bg-orange-500; }
.payment-bar-late-90 { @apply bg-red-500; }
.payment-bar-late-120 { @apply bg-red-700; }
.payment-bar-chargeoff { @apply bg-red-900; }

/* Timeline connector lines */
.timeline-line {
  @apply absolute left-0 top-0 bottom-0 w-0.5 bg-slate-700;
}

/* Bureau column highlights */
.bureau-experian { @apply bg-blue-900/10 border-blue-500/30; }
.bureau-equifax { @apply bg-red-900/10 border-red-500/30; }
.bureau-transunion { @apply bg-green-900/10 border-green-500/30; }

/* Violation severity badges */
.severity-critical { @apply bg-red-600 text-white; }
.severity-high { @apply bg-orange-600 text-white; }
.severity-medium { @apply bg-yellow-600 text-white; }
.severity-low { @apply bg-blue-600 text-white; }
```

---

## 🔐 Authentication Integration

### Example with JWT

```typescript
import { useState, useEffect } from 'react';

function AuthenticatedDashboard() {
  const [token, setToken] = useState<string | null>(null);
  const [reportData, setReportData] = useState(null);

  useEffect(() => {
    // Load token from localStorage
    const savedToken = localStorage.getItem('authToken');
    setToken(savedToken);
  }, []);

  const loadReport = async (reportId: string) => {
    const response = await fetch(`/api/reports/${reportId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    setReportData(data);
  };

  if (!token) {
    return <LoginPage onLogin={setToken} />;
  }

  return (
    <CreditReportDashboard
      reportData={reportData}
      // ... other props
    />
  );
}
```

---

## 📊 State Management Integration

### Redux Example

```typescript
// store/creditReportSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CreditReportState {
  reportData: CreditReportData | null;
  selectedViolationId: string | null;
  activeTab: string;
  language: 'en' | 'es';
  filters: {
    bureau: string;
    accountType: string;
    showViolationsOnly: boolean;
  };
}

const initialState: CreditReportState = {
  reportData: null,
  selectedViolationId: null,
  activeTab: 'OVERVIEW',
  language: 'en',
  filters: {
    bureau: 'ALL',
    accountType: 'ALL',
    showViolationsOnly: false
  }
};

const creditReportSlice = createSlice({
  name: 'creditReport',
  initialState,
  reducers: {
    setReportData(state, action: PayloadAction<CreditReportData>) {
      state.reportData = action.payload;
    },
    setSelectedViolation(state, action: PayloadAction<string | null>) {
      state.selectedViolationId = action.payload;
    },
    setActiveTab(state, action: PayloadAction<string>) {
      state.activeTab = action.payload;
    },
    setLanguage(state, action: PayloadAction<'en' | 'es'>) {
      state.language = action.payload;
    },
    setFilters(state, action: PayloadAction<Partial<typeof initialState.filters>>) {
      state.filters = { ...state.filters, ...action.payload };
    }
  }
});

export const { setReportData, setSelectedViolation, setActiveTab, setLanguage, setFilters } = creditReportSlice.actions;
export default creditReportSlice.reducer;
```

### Usage with Redux

```typescript
import { useSelector, useDispatch } from 'react-redux';
import { setReportData, setLanguage } from './store/creditReportSlice';

function App() {
  const dispatch = useDispatch();
  const reportData = useSelector((state: RootState) => state.creditReport.reportData);
  const language = useSelector((state: RootState) => state.creditReport.language);

  return (
    <CreditReportDashboard
      reportData={reportData}
      language={language}
      onLanguageChange={(lang) => dispatch(setLanguage(lang))}
      // ... other props
    />
  );
}
```

---

## 🧪 Testing Integration

### Jest + React Testing Library

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreditReportDashboard } from './components/CreditReportDashboard';
import { sampleCreditReportData } from './fixtures/sampleData';

describe('CreditReportDashboard', () => {
  it('renders dashboard with report data', () => {
    render(
      <CreditReportDashboard
        reportData={sampleCreditReportData}
        language="en"
        onLanguageChange={() => {}}
      />
    );
    
    expect(screen.getByText('FCRA Violation Detector')).toBeInTheDocument();
    expect(screen.getByText('Total Violations')).toBeInTheDocument();
  });

  it('switches tabs correctly', () => {
    render(
      <CreditReportDashboard
        reportData={sampleCreditReportData}
        language="en"
        onLanguageChange={() => {}}
      />
    );
    
    const comparisonTab = screen.getByText('Bureau Comparison');
    fireEvent.click(comparisonTab);
    
    expect(screen.getByText('Side-by-Side')).toBeInTheDocument();
  });

  it('filters violations by severity', async () => {
    render(
      <CreditReportDashboard
        reportData={sampleCreditReportData}
        language="en"
        onLanguageChange={() => {}}
      />
    );
    
    const violationsTab = screen.getByText('Violations');
    fireEvent.click(violationsTab);
    
    const criticalFilter = screen.getByText('Critical');
    fireEvent.click(criticalFilter);
    
    await waitFor(() => {
      const violations = screen.getAllByText(/FCRA/);
      expect(violations.length).toBeGreaterThan(0);
    });
  });
});
```

---

## 🌐 Deployment

### Environment Variables

Create `.env`:

```bash
# API Configuration
REACT_APP_API_URL=https://api.fcra-supreme.com
REACT_APP_API_KEY=your_api_key_here

# Feature Flags
REACT_APP_ENABLE_PDF_EXPORT=true
REACT_APP_ENABLE_DOCUMENT_GENERATION=true
REACT_APP_ENABLE_CLASS_ACTION_ASSESSMENT=true

# Analytics
REACT_APP_GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X

# Storage
REACT_APP_STORAGE_BUCKET=fcra-supreme-documents
```

### Build for Production

```bash
npm run build
# or
yarn build
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://backend:5000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/fcra_supreme
    depends_on:
      - db

  db:
    image: postgres:14
    environment:
      - POSTGRES_DB=fcra_supreme
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

---

## 📈 Performance Optimization

### Code Splitting

```typescript
import { lazy, Suspense } from 'react';

const BureauComparison = lazy(() => import('./components/BureauComparison'));
const TimelineView = lazy(() => import('./components/TimelineView'));
const ViolationList = lazy(() => import('./components/ViolationList'));

function Dashboard() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      {activeTab === 'COMPARISON' && <BureauComparison />}
      {activeTab === 'TIMELINE' && <TimelineView />}
      {activeTab === 'VIOLATIONS' && <ViolationList />}
    </Suspense>
  );
}
```

### Memoization

```typescript
import { useMemo } from 'react';

function InteractiveCreditReport({ accounts }) {
  const filteredAccounts = useMemo(() => {
    return accounts.filter(/* complex filtering logic */);
  }, [accounts, filterCriteria]);

  return <div>{/* render filtered accounts */}</div>;
}
```

---

## 🔧 Troubleshooting

### Common Issues

**Issue 1: Components not rendering**
- Ensure all dependencies installed: `npm install lucide-react`
- Check data structure matches expected types
- Verify Tailwind CSS configured correctly

**Issue 2: Payment history not displaying**
- Check `paymentHistory` array exists on account object
- Verify each history entry has `month` and `status` fields
- Ensure status values are valid enum values

**Issue 3: Bureau comparison not syncing**
- Check `syncScroll` state is true
- Verify all three scroll refs are properly initialized
- Ensure scroll event handlers attached correctly

---

## 📞 Support

For implementation help:
1. Review this integration guide
2. Check `DemoPage.tsx` for working example
3. Review component props in JSDoc comments
4. Check `INTERACTIVE_FEATURES.md` for detailed feature documentation

---

**Last Updated:** January 2024
**Version:** 2.0.0
