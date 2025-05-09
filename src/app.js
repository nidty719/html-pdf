/**
 * Main application file for HTML to PDF conversion service
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { convertHtmlToPdf } = require('./converter');
const { validateRequest, errorHandler, notFoundHandler } = require('./middleware');

// Initialize Express app
const app = express();
const port = process.env.PORT || 3000;

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, '../uploads');
      // Create uploads directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename
      const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  }),
  fileFilter: (req, file, cb) => {
    // Accept only HTML files
    if (file.mimetype === 'text/html' || path.extname(file.originalname).toLowerCase() === '.html') {
      cb(null, true);
    } else {
      cb(new Error('Only HTML files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  }
});

// Apply middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));

// Main endpoint for HTML to PDF conversion
app.post('/convert', validateRequest, async (req, res, next) => {
  try {
    const { html, options = {} } = req.body;

    const pdfBuffer = await convertHtmlToPdf(html, options);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${options.filename || 'output.pdf'}"`);

    // Send the PDF buffer directly to the client
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// File upload endpoint for HTML to PDF conversion
app.post('/convert/file', upload.single('htmlFile'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No HTML file uploaded'
      });
    }

    // Parse options from the request body
    const options = req.body.options ? JSON.parse(req.body.options) : {};

    // Read file content
    const filePath = req.file.path;
    const html = fs.readFileSync(filePath, 'utf8');

    // Delete the temporary file
    fs.unlinkSync(filePath);

    // Convert HTML to PDF
    const pdfBuffer = await convertHtmlToPdf(html, options);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${options.filename || 'output.pdf'}"`);

    // Send the PDF buffer directly to the client
    res.send(pdfBuffer);
  } catch (error) {
    // Clean up temporary file if it exists
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});

// Root endpoint with basic info
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'HTML to PDF Converter',
    endpoints: {
      '/convert': 'POST - Convert HTML to PDF from JSON body',
      '/convert/file': 'POST - Convert HTML to PDF from uploaded file',
      '/health': 'GET - Service health check'
    }
  });
});

// Apply error handling middleware
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`HTML to PDF service listening on port ${port}`);
  });
}

module.exports = { app };