/**
 * CSS styles for the report
 */
function getStyles() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 12px;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .report-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px;
        }
        
        .report-header {
            text-align: center;
            margin-bottom: 40px;
            padding-bottom: 30px;
            border-bottom: 3px solid #2563eb;
        }
        
        .report-title {
            font-size: 32px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 10px;
        }
        
        .report-subtitle {
            font-size: 16px;
            color: #6b7280;
            margin-bottom: 5px;
        }
        
        .report-date-range {
            font-size: 14px;
            color: #9ca3af;
            font-weight: 500;
        }
        
        .table-of-contents {
            background: #f9fafb;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 40px;
        }
        
        .toc-title {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .toc-list {
            list-style: none;
        }
        
        .toc-item {
            padding: 8px 0;
            border-bottom: 1px solid #e5e7eb;
        }
        
        .toc-item:last-child {
            border-bottom: none;
        }
        
        .toc-link {
            color: #2563eb;
            text-decoration: none;
            font-weight: 500;
        }

        .sub-account-chapter {
            page-break-before: always;
            margin-bottom: 50px;
        }

        .sub-account-chapter:first-of-type {
            page-break-before: auto;
        }
        
        .chapter-title {
            font-size: 28px;
            font-weight: 700;
            color: #1e40af;
            margin-bottom: 30px;
            padding-bottom: 15px;
            border-bottom: 3px solid #93c5fd;
        }

        .metric-section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }
        
        .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 20px;
            padding: 10px;
            background: #eff6ff;
            border-left: 4px solid #2563eb;
            page-break-after: avoid;
        }

        .location-section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            page-break-inside: avoid;
        }

        .location-title {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 15px;
        }
        
        .summary-box {
            background: #fef3c7;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 20px;
            border-left: 4px solid #f59e0b;
        }
        
        .summary-text {
            font-size: 14px;
            color: #92400e;
            font-weight: 500;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        thead {
            background: #1e40af;
            color: white;
        }
        
        th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
            font-size: 13px;
        }
        
        tbody tr:hover {
            background: #f9fafb;
        }
        
        tbody tr:last-child td {
            border-bottom: none;
        }
        
        .no-data {
            text-align: center;
            padding: 40px;
            color: #9ca3af;
            font-style: italic;
        }
        
        .chart-container {
            margin: 20px 0;
            padding: 20px;
            background: white;
            border-radius: 8px;
            page-break-inside: avoid;
        }
        
        .chart-title {
            font-size: 14px;
            font-weight: 600;
            color: #374151;
            margin-bottom: 15px;
            text-align: center;
        }
        
        canvas {
            max-width: 100%;
            height: 250px !important;
        }
        
        .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            text-align: center;
            color: #9ca3af;
            font-size: 11px;
        }
        
        .error-message {
            background: #fee2e2;
            color: #991b1b;
            padding: 12px;
            border-radius: 6px;
            border-left: 4px solid #dc2626;
            margin-bottom: 15px;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-completed {
            background: #d1fae5;
            color: #065f46;
        }
        
        .status-working {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .status-waiting {
            background: #fef3c7;
            color: #92400e;
        }
        
        .status-not-started {
            background: #f3f4f6;
            color: #4b5563;
        }
        
        @media print {
            body {
                print-color-adjust: exact;
                -webkit-print-color-adjust: exact;
            }
            
            .page-break {
                page-break-before: always;
            }
            
            .no-page-break {
                page-break-inside: avoid;
            }
        }
    `;
}

module.exports = { getStyles };
