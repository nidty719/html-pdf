/**
 * HTML to PDF Converter - Google Cloud Function Entry Point
 */

const functions = require('@google-cloud/functions-framework');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { convertHtmlToPdf } = require('./src/converter');
const multer = require('multer');

// Configure multer for file uploads in memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept only HTML files
    if (file.mimetype === 'text/html' || path.extname(file.originalname).toLowerCase() === '.html') {
      cb(null, true);
    } else {
      cb(new Error('Only HTML files are allowed'));
    }
  }
});

// Middleware for multer in Cloud Functions
const multerMiddleware = (req, res, next) => {
  if (!req.rawBody || !req.get('content-type')?.includes('multipart/form-data')) {
    return next();
  }
  
  // Process the multipart form data
  upload.single('htmlFile')(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
    next();
  });
};

/**
 * Main HTTP function for HTML to PDF conversion
 */
functions.http('htmlToPdf', async (req, res) => {
  try {
    // Apply CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    
    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }
    
    // Only allow POST method
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
    
    // Apply multer middleware for file uploads
    await new Promise((resolve) => multerMiddleware(req, res, resolve));
    
    let html;
    let options = {};
    
    // Check if the request is a file upload or JSON payload
    if (req.file) {
      // File upload case
      html = req.file.buffer.toString('utf-8');
      options = req.body.options ? JSON.parse(req.body.options) : {};
    } else {
      // JSON payload case
      if (!req.body.html) {
        return res.status(400).json({
          success: false,
          error: 'HTML content is required'
        });
      }
      
      html = req.body.html;
      options = req.body.options || {};
    }
    
    // Convert HTML to PDF
    const pdfBuffer = await convertHtmlToPdf(html, options);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${options.filename || 'output.pdf'}"`);
    
    // Send the PDF buffer directly to the client
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error in HTML to PDF conversion:', error);
    
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Error converting HTML to PDF',
        message: error.message
      });
    }
  }
});