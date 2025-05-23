/**
 * PDF to Images conversion module
 * Uses pdf-lib and sharp to convert PDF pages to images
 */

const { PDFDocument } = require('pdf-lib');
const sharp = require('sharp');
const puppeteer = require('puppeteer');
const os = require('os');
const fs = require('fs');

/**
 * Find Chrome executable path based on the platform
 * @returns {string|undefined} Chrome executable path or undefined
 */
function findChromePath() {
  const chromePaths = {
    darwin: [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Chrome.app/Contents/MacOS/Chrome',
    ],
    linux: [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
    ],
    win32: [
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
      process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    ],
  };

  const platform = os.platform();
  const paths = chromePaths[platform] || [];

  for (const browserPath of paths) {
    try {
      if (fs.existsSync(browserPath)) {
        return browserPath;
      }
    } catch (err) {
      // Continue to next path
    }
  }

  return undefined;
}

/**
 * Convert PDF buffer to array of image buffers
 * @param {Buffer} pdfBuffer - PDF file as buffer
 * @param {object} options - Conversion options
 * @param {string} options.format - Image format ('png', 'jpeg', 'webp')
 * @param {number} options.dpi - Resolution in DPI (default: 150)
 * @param {number} options.quality - Quality for JPEG/WebP (1-100)
 * @returns {Promise<Array<{page: number, buffer: Buffer}>>} Array of image buffers with page numbers
 */
async function convertPdfToImages(pdfBuffer, options = {}) {
  const {
    format = 'png',
    dpi = 150,
    quality = 90
  } = options;

  let browser;
  try {
    // Launch browser with enhanced configuration
    const launchOptions = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-extensions'
      ],
      headless: 'new',
      timeout: 60000,
    };

    // Find Chrome executable path
    const executablePath = findChromePath();
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    // Convert PDF buffer to data URL
    const base64Pdf = pdfBuffer.toString('base64');
    const dataUrl = `data:application/pdf;base64,${base64Pdf}`;

    // Create HTML with embedded PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { margin: 0; padding: 0; }
          #pdf-container { width: 100%; height: 100vh; }
        </style>
      </head>
      <body>
        <embed id="pdf-container" src="${dataUrl}" type="application/pdf" width="100%" height="100%">
      </body>
      </html>
    `;

    await page.setContent(html);
    
    // Load the PDF to get page count
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();
    
    const images = [];

    // Process each page
    for (let i = 0; i < pageCount; i++) {
      // Create a new page for each PDF page
      const renderPage = await browser.newPage();
      
      // Set viewport based on DPI
      const scaleFactor = dpi / 72; // 72 DPI is default
      const pageInfo = pdfDoc.getPage(i);
      const { width, height } = pageInfo.getSize();
      
      await renderPage.setViewport({
        width: Math.ceil(width * scaleFactor),
        height: Math.ceil(height * scaleFactor),
        deviceScaleFactor: scaleFactor
      });

      // Create HTML that shows only the specific page
      const singlePageHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { margin: 0; padding: 0; overflow: hidden; }
            #pdf-container { 
              width: ${width}px; 
              height: ${height}px;
              transform: scale(${scaleFactor});
              transform-origin: top left;
            }
          </style>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        </head>
        <body>
          <canvas id="pdf-canvas"></canvas>
          <script>
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
            
            async function renderPdf() {
              const pdfData = atob('${base64Pdf}');
              const pdfArray = new Uint8Array(pdfData.length);
              for (let i = 0; i < pdfData.length; i++) {
                pdfArray[i] = pdfData.charCodeAt(i);
              }
              
              const pdf = await pdfjsLib.getDocument({ data: pdfArray }).promise;
              const page = await pdf.getPage(${i + 1});
              
              const viewport = page.getViewport({ scale: ${scaleFactor} });
              const canvas = document.getElementById('pdf-canvas');
              const context = canvas.getContext('2d');
              
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              
              await page.render({
                canvasContext: context,
                viewport: viewport
              }).promise;
            }
            
            renderPdf();
          </script>
        </body>
        </html>
      `;

      await renderPage.setContent(singlePageHtml);
      await renderPage.waitForFunction(() => {
        const canvas = document.getElementById('pdf-canvas');
        return canvas && canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3] > 0;
      }, { timeout: 30000 });

      // Take screenshot
      const screenshotBuffer = await renderPage.screenshot({
        fullPage: true,
        type: format === 'jpeg' ? 'jpeg' : 'png',
        quality: format === 'jpeg' ? quality : undefined
      });

      // Process with sharp for additional options
      let processedBuffer = screenshotBuffer;
      
      if (format === 'webp') {
        processedBuffer = await sharp(screenshotBuffer)
          .webp({ quality })
          .toBuffer();
      }

      images.push({
        page: i + 1,
        buffer: processedBuffer
      });

      await renderPage.close();
    }

    return images;
  } catch (error) {
    console.error('Error in PDF to images conversion:', error);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error('Error closing browser:', closeError);
      }
    }
  }
}


module.exports = { convertPdfToImages };