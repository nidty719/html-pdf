/**
 * HTML to PDF conversion module
 * Uses Puppeteer to convert HTML content to PDF
 */

const puppeteer = require('puppeteer');
const path = require('path');
const os = require('os');

/**
 * Find Chrome executable path based on the platform
 * @returns {string|undefined} Chrome executable path or undefined
 */
function findChromePath() {
  // Common Chrome paths by platform
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

  // Find first existing Chrome path
  const fs = require('fs');
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
 * Convert HTML content to PDF buffer
 * @param {string} html - HTML content to convert
 * @param {object} options - PDF generation options
 * @returns {Promise<Buffer>} PDF as buffer
 */
async function convertHtmlToPdf(html, options = {}) {
  let browser;
  try {
    // Configuration for launching browser
    const launchOptions = {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-extensions'
      ],
      headless: 'new', // Use new headless mode
      timeout: 60000, // Increase timeout to 60 seconds
    };

    // Find Chrome executable path
    const executablePath = findChromePath();
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    // Launch browser with enhanced configuration
    console.log('Launching browser with options:', JSON.stringify(launchOptions, null, 2));
    browser = await puppeteer.launch(launchOptions);

    // Configure page
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(30000);

    // Set content with timeout options
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Generate PDF with provided options
    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      orientation: options.orientation || 'portrait',
      margin: options.margin || { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      printBackground: options.printBackground !== undefined ? options.printBackground : true,
      scale: options.scale || 1,
      headerTemplate: options.headerTemplate || '',
      footerTemplate: options.footerTemplate || '',
      timeout: 30000
    });

    return pdfBuffer;
  } catch (error) {
    console.error('Error in PDF conversion:', error);
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

module.exports = { convertHtmlToPdf };