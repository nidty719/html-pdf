/**
 * HTML to PDF Converter - Google Cloud Function Entry Point
 */

const functions = require('@google-cloud/functions-framework');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { convertHtmlToPdf } = require('./src/converter');
const Busboy = require('busboy');

/**
 * Parse multipart/form-data
 * @param {object} req - HTTP request object
 * @returns {Promise<object>} Parsed form data
 */
function parseFormData(req) {
  return new Promise((resolve, reject) => {
    // Check if this is a multipart/form-data request
    if (!req.headers['content-type'] || !req.headers['content-type'].includes('multipart/form-data')) {
      return resolve({});
    }

    const busboy = Busboy({ 
      headers: req.headers,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      }
    });

    const fields = {};
    let fileBuffer = null;
    let fileName = null;
    let fileError = null;

    // Handle non-file fields
    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    // Handle file upload
    busboy.on('file', (fieldname, file, info) => {
      const { filename, encoding, mimeType } = info;
      
      // Only accept HTML files
      if (mimeType !== 'text/html' && !filename.toLowerCase().endsWith('.html')) {
        fileError = 'Only HTML files are allowed';
        file.resume(); // Discard the file
        return;
      }

      // Collect file data
      const chunks = [];
      fileName = filename;

      file.on('data', (data) => {
        chunks.push(data);
      });

      file.on('end', () => {
        if (!fileError) {
          fileBuffer = Buffer.concat(chunks);
        }
      });
    });

    // Handle completion
    busboy.on('finish', () => {
      if (fileError) {
        return reject(new Error(fileError));
      }
      
      resolve({
        fields,
        file: fileBuffer ? {
          buffer: fileBuffer,
          filename: fileName
        } : null
      });
    });

    // Handle errors
    busboy.on('error', (error) => {
      reject(error);
    });

    // Pipe the request to busboy
    if (req.rawBody) {
      // Cloud Functions environment
      busboy.end(req.rawBody);
    } else {
      // Regular Node.js environment
      req.pipe(busboy);
    }
  });
}

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
    
    let html;
    let options = {};
    
    // Handle request based on content type
    const contentType = req.headers['content-type'] || '';
    console.log('Content-Type:', contentType);
    
    if (contentType.includes('multipart/form-data')) {
      // File upload case - parse form data
      try {
        console.log('Parsing multipart form data');
        const formData = await parseFormData(req);
        console.log('Form data parsed:', {
          hasFile: !!formData.file,
          fieldNames: Object.keys(formData.fields)
        });
        
        if (!formData.file) {
          return res.status(400).json({
            success: false,
            error: 'No HTML file uploaded'
          });
        }
        
        html = formData.file.buffer.toString('utf-8');
        
        if (formData.fields.options) {
          try {
            options = JSON.parse(formData.fields.options);
          } catch (err) {
            console.warn('Failed to parse options JSON:', err);
          }
        }
      } catch (err) {
        console.error('Form data parsing error:', err);
        return res.status(400).json({
          success: false,
          error: err.message || 'Error processing form data'
        });
      }
    } else if (contentType.includes('application/json')) {
      // JSON payload case
      if (!req.body || !req.body.html) {
        return res.status(400).json({
          success: false,
          error: 'HTML content is required'
        });
      }
      
      html = req.body.html;
      options = req.body.options || {};
    } else {
      return res.status(415).json({
        success: false,
        error: 'Unsupported Media Type. Use multipart/form-data or application/json'
      });
    }
    
    console.log('Converting HTML to PDF with options:', options);
    
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