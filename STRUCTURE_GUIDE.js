/**
 * VISUAL GUIDE: Report Structure Flow
 * ====================================
 * 
 * OLD STRUCTURE (grouped by metric):
 * 
 *   Report
 *   ├── GMB Reinstatement
 *   │   ├── Sub-Account A
 *   │   ├── Sub-Account B
 *   │   └── Sub-Account C
 *   ├── GMB Verification
 *   │   ├── Sub-Account A
 *   │   ├── Sub-Account B
 *   │   └── Sub-Account C
 *   └── Desktop Maps Impressions
 *       ├── Sub-Account A (all locations)
 *       ├── Sub-Account B (all locations)
 *       └── Sub-Account C (all locations)
 * 
 * 
 * NEW STRUCTURE (grouped by sub-account):
 * 
 *   Report
 *   ├── [PAGE BREAK] Sub-Account A
 *   │   ├── GMB Reinstatement Table
 *   │   ├── GMB Verification Table
 *   │   ├── Review Removal Table
 *   │   └── Performance Metrics by Location
 *   │       ├── Location 1
 *   │       │   ├── 📊 Desktop Maps Impressions
 *   │       │   ├── 📊 Mobile Maps Impressions
 *   │       │   └── 📊 Call Clicks
 *   │       └── Location 2
 *   │           ├── 📊 Desktop Maps Impressions
 *   │           ├── 📊 Mobile Maps Impressions
 *   │           └── 📊 Call Clicks
 *   │
 *   ├── [PAGE BREAK] Sub-Account B
 *   │   ├── GMB Reinstatement Table
 *   │   ├── GMB Verification Table
 *   │   ├── Review Removal Table
 *   │   └── Performance Metrics by Location
 *   │       └── Location 1
 *   │           ├── 📊 Desktop Maps Impressions
 *   │           ├── 📊 Mobile Maps Impressions
 *   │           └── 📊 Call Clicks
 *   │
 *   └── [PAGE BREAK] Sub-Account C
 *       ├── GMB Reinstatement Table
 *       ├── GMB Verification Table
 *       ├── Review Removal Table
 *       └── Performance Metrics by Location
 *           ├── Location 1
 *           │   ├── 📊 Desktop Maps Impressions
 *           │   ├── 📊 Mobile Maps Impressions
 *           │   └── 📊 Call Clicks
 *           ├── Location 2
 *           │   ├── 📊 Desktop Maps Impressions
 *           │   ├── 📊 Mobile Maps Impressions
 *           │   └── 📊 Call Clicks
 *           └── Location 3
 *               ├── 📊 Desktop Maps Impressions
 *               ├── 📊 Mobile Maps Impressions
 *               └── 📊 Call Clicks
 * 
 * 
 * KEY CHANGES:
 * ===========
 * 
 * 1. Each sub-account is now its own chapter (starts on new page)
 * 2. All metrics for a sub-account are grouped together
 * 3. Performance metrics are organized by location
 * 4. Each location shows all requested metrics as individual graphs
 * 5. If 3 metrics requested → each location gets 3 graphs
 * 
 * 
 * LOOP STRUCTURE IN CODE:
 * ======================
 * 
 * for each subAccount {                          // Loop 1: Sub-Account Chapters
 *     
 *     if (gmb_reinstatement) {                   // Table 1
 *         generateReinstatementTable()
 *     }
 *     
 *     if (gmb_verification) {                    // Table 2
 *         generateVerificationTable()
 *     }
 *     
 *     if (review_removal) {                      // Table 3
 *         generateReviewRemovalTable()
 *     }
 *     
 *     for each location {                        // Loop 2: Locations
 *         
 *         for each performanceMetric {           // Loop 3: Metrics per Location
 *             generateLocationChart()            // Generate graph
 *         }
 *     }
 * }
 * 
 */

// This file is for reference only
