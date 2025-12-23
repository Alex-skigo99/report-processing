const pdfMake = require("pdfmake/build/pdfmake");
const pdfFonts = require("pdfmake/build/vfs_fonts");
const fs = require("fs");
const QRCode = require("qrcode");
const puppeteer = require("puppeteer");
const {
  isDockerEnv,
  fileUploadConsts: { TEMP_FOLDER_PATH }
} = require("../../../config");
const { capitalizeFirstLetter, addSpacesToCapitalLetters } = require("../../utils");

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD"
});

const convertMoneyStringToNumber = (moneyString) => {
  const regexDollarSignOrComma = /[$,]/g;
  const reducedMoneyString = moneyString.replace(regexDollarSignOrComma, "");
  const moneyNumber = Number(reducedMoneyString);
  return moneyNumber;
};

/* PDF MAKE LIBRARY USING SPECIFIC CONTENT - START */

const generatePdfFromPdfContent = async (pdfContent) => {
  pdfMake.vfs = pdfFonts.pdfMake.vfs;
  const pdfDoc = pdfMake.createPdf(pdfContent);
  const pdfBuffer = await cretePdfBufferFromPdfDoc(pdfDoc);

  return pdfBuffer;
};

const cretePdfBufferFromPdfDoc = (pdfDoc) =>
  new Promise((resolve) => {
    pdfDoc.getBuffer(resolve);
  });

/* PDF MAKE LIBRARY USING SPECIFIC CONTENT - END */

const generateInvoicePdf = async (invoiceDetails, monthlyExpenses) => {
  const htmlFilePath = `${__dirname}/pdfTemplates/INVOICE.html`;
  const insightGenieLogo = `${__dirname}/../../../assets/images/insightGenieLogo.png`;

  const htmlTemplate = await fs.promises.readFile(htmlFilePath, "utf8");

  const htmlBody = fillInHtmlBody(htmlTemplate, invoiceDetails);

  const htmlBodyWithQrCode = await attachQrCodeToHtml(htmlBody);

  const prepaidCreditsInCents = convertMoneyStringToNumber(invoiceDetails.prepaidCredits) * 100;

  const htmlBodyWithMonthlyExpenses = addMonthlyExpensesToInvoiceHtml(htmlBodyWithQrCode, monthlyExpenses, prepaidCreditsInCents);

  const htmlBodyWithImages = await addImagesToHtml(htmlBodyWithMonthlyExpenses, { insightGenieLogo });

  const pdfBuffer = await generatePdfBuffer(htmlBodyWithImages);

  return pdfBuffer;
};

const generatePdfBuffer = async (htmlStringContent) => {
  const puppeteerArgs = isDockerEnv
    ? { args: ["--no-sandbox", "--disable-setuid-sandbox"], executablePath: "google-chrome-stable", headless: "new" }
    : { headless: "new" };
  const browser = await puppeteer.launch(puppeteerArgs);
  const page = await browser.newPage();

  await page.setContent(htmlStringContent, { waitUntil: "networkidle0" });

  const pdfOptions = {
    format: "A4",
    printBackground: true
  };

  if (process.env.NODE_ENV === "development") {
    // for development purposes, save the pdf file in the tmpUploads folder
    // use the "vscode-pdf" extension to view the pdf file dynamically update
    const pdfFilePath = `${TEMP_FOLDER_PATH}/health_report.pdf`;
    await page.pdf({
      path: pdfFilePath, // path argument creates a new file
      ...pdfOptions
    });
  }

  const pdfBuffer = await page.pdf(pdfOptions);

  await browser.close();

  return pdfBuffer;
};

const getScoreStatusForInvoice = (status) => {
  if (!status || status !== "rejected") return "";
  return " - Faulty";
};

const addMonthlyExpensesToInvoiceHtml = (htmlBody, monthlyExpenses, prepaidCreditsInCents) => {
  let deductedPrepaidCreditsInCents = prepaidCreditsInCents;

  const monthlyExpensesHtml = monthlyExpenses
    .map(({ costPerScoreInCents, numberOfScores, scoreType, scoreStatus }) => {
      const totalExpenseCostInCents = numberOfScores * costPerScoreInCents;
      const amountToDeduct =
        deductedPrepaidCreditsInCents - totalExpenseCostInCents < 0 ? deductedPrepaidCreditsInCents : totalExpenseCostInCents;
      const amountPrepaidCreditsLeft = deductedPrepaidCreditsInCents / 100;
      deductedPrepaidCreditsInCents -= amountToDeduct;
      return `<tr class="f-10 vertical-align-center right" style="box-shadow: inset 0px -1px 0px rgba(0, 0, 0, 0.12)">
      <td class="left">${addSpacesToCapitalLetters(capitalizeFirstLetter(scoreType))}${getScoreStatusForInvoice(scoreStatus)}</td>
      <td class="py-10 pr-20">${numberOfScores}</td>
      <td class="py-10 pr-20">${moneyFormatter.format(costPerScoreInCents / 100)}</td>
      <td class="py-10 pr-20">${moneyFormatter.format(totalExpenseCostInCents / 100)}</td>
      <td class="py-10 pr-20">${moneyFormatter.format(amountPrepaidCreditsLeft)}</td>
      <td class="py-10 pr-20">${moneyFormatter.format((totalExpenseCostInCents - amountToDeduct) / 100)}</td>
    </tr>`;
    })
    .join("\n");

  const htmlWithMonthlyExpenses = htmlBody.replace(/%monthlyExpenses%/g, monthlyExpensesHtml);

  return htmlWithMonthlyExpenses;
};

const fillInHtmlBody = (htmlTemplate, fieldsToReplace) =>
  Object.entries(fieldsToReplace).reduce((htmlBody, [key, value]) => {
    const regex = new RegExp(`%${key}%`, "g");
    return htmlBody.replace(regex, value);
  }, htmlTemplate);

const addImagesToHtml = async (htmlBody, keysToImagePathObj) => {
  let htmlBodyWithImages = htmlBody;

  const addingImagePromises = Object.entries(keysToImagePathObj).map(async ([key, imagePath]) => {
    const regex = new RegExp(`%${key}%`, "g");

    let base64Image;

    if (imagePath.startsWith("data:image/")) {
      base64Image = imagePath;
    } else if (imagePath.startsWith("https://maps.googleapis.com/maps/api/")) {
      try {
        const response = await fetch(imagePath);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        base64Image = `data:image/png;base64,${buffer.toString("base64")}`;
      } catch (error) {
        console.error("Error fetching Google Maps image:", error);
      }
    } else {
      const image = await fs.promises.readFile(imagePath);
      base64Image = `data:image/png;base64,${image.toString("base64")}`;
    }

    htmlBodyWithImages = htmlBodyWithImages.replace(regex, base64Image);
  });

  await Promise.all(addingImagePromises);
  return htmlBodyWithImages;
};

const attachQrCodeToHtml = (htmlString) =>
  new Promise((resolve, reject) => {
    const qrData = "https://panel.insightgenie.ai/dashboard/payments";
    const qrOptions = {
      width: 120,
      errorCorrectionLevel: "H"
    };

    QRCode.toDataURL(qrData, qrOptions, (err, url) => {
      if (err) reject(err);
      const regex = /%qr%/g;
      const imgToReplace = `${url}" alt="QR Code"`;
      const modifiedHtmlString = htmlString.replace(regex, imgToReplace);
      resolve(modifiedHtmlString);
    });
  });

module.exports = {
  generatePdfFromPdfContent,
  generateInvoicePdf,
  fillInHtmlBody,
  generatePdfBuffer,
  addImagesToHtml
};
