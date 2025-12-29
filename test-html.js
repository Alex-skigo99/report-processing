const fs = require("fs");
const path = require("path");
const { generateReportHTML } = require("./htmlGenerator/htmlGenerator");
const report_data = require("./report_data.json");

// Sample test data
const testData = {
    title: "Monthly Performance Report",
    startDate: "2025-12-01",
    endDate: "2025-12-31",
    organizationName: "Acme Corporation",
    subAccounts: report_data
};

try {
    console.log("Generating report HTML with test data...");
    const html = generateReportHTML(testData);
    
    // Create html directory if it doesn't exist
    const htmlDir = path.join(__dirname, "html");
    if (!fs.existsSync(htmlDir)) {
        fs.mkdirSync(htmlDir, { recursive: true });
    }
    
    // Write HTML to file
    const outputPath = path.join(htmlDir, "test-report.html");
    fs.writeFileSync(outputPath, html, "utf-8");
    
    console.log(`✓ HTML report generated successfully!`);
    console.log(`✓ Output saved to: ${outputPath}`);
    console.log(`✓ File size: ${(html.length / 1024).toFixed(2)} KB`);
    
} catch (error) {
    console.error("Error generating report:", error.message);
    console.error(error.stack);
    process.exit(1);
}
