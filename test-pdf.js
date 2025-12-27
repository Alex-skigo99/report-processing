const puppeteer = require("puppeteer-core");
const fs = require("fs").promises;
const path = require("path");

async function testPdfGeneration() {
    try {
        console.log("Starting PDF generation test...");

        // Read the HTML file
        const htmlPath = path.join(__dirname, "html", "html_01.html");
        console.log(`Reading HTML from: ${htmlPath}`);
        const html = await fs.readFile(htmlPath, "utf-8");
        console.log("HTML file loaded successfully");

        // Launch browser (use local Chrome/Chromium for testing)
        console.log("Launching browser...");
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        });

        // Create page and generate PDF
        console.log("Creating PDF...");
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: "networkidle0" });
        
        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "20mm",
                right: "15mm",
                bottom: "20mm",
                left: "15mm",
            },
        });

        await browser.close();
        console.log("PDF generated successfully");

        // Save PDF to local pdf folder
        const pdfPath = path.join(__dirname, "pdf", "test-report.pdf");
        await fs.writeFile(pdfPath, pdfBuffer);
        console.log(`PDF saved successfully to: ${pdfPath}`);

    } catch (error) {
        console.error("Error generating PDF:", error);
        process.exit(1);
    }
}

// Run the test
testPdfGeneration();
