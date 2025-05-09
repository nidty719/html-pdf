# HTML to PDF Conversion Service

## High-Level Objective

Create a simple function that converts HTML content to PDF format. The function will:
1. Accept HTML input (either as a file or string content)
2. Process and render the HTML
3. Convert the rendered HTML to a PDF file
4. Return the PDF directly to the user as a downloadable file

This function will be designed as a standalone service that can be integrated with various hosting platforms. The project will be hosted on GitHub, making it easy to clone and deploy wherever needed.

**Git Step:** After defining the high-level objectives, commit changes with message "Define high-level objectives for HTML to PDF conversion"

## Type Changes

### Required Types:
1. **InputRequest**: Schema for the incoming request
```typescript
interface InputRequest {
  html: string;           // HTML content as string
  options?: PdfOptions;   // Optional configuration settings
}
```

2. **PdfOptions**: Configuration options for PDF generation
```typescript
interface PdfOptions {
  format?: string;        // Paper format (A4, Letter, etc.)
  orientation?: string;   // Portrait or Landscape
  margin?: {              // Page margins
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  headerTemplate?: string; // HTML template for page header
  footerTemplate?: string; // HTML template for page footer
  scale?: number;          // Scale of the webpage rendering
  printBackground?: boolean; // Print background graphics
  filename?: string;      // Custom filename for the downloaded PDF
}
```

3. **OutputResult**: Schema for error responses
```typescript
interface OutputResult {
  success: boolean;
  error?: string;         // Error message if applicable
}
```

**Git Step:** After defining the type definitions, commit changes with message "Add type definitions for HTML to PDF conversion function"

## Method Changes

### 1. Function Setup
Create the main function that will handle the conversion:

```javascript
const express = require('express');
const puppeteer = require('puppeteer');
const app = express();
const port = process.env.PORT || 3000;

// Middleware to parse JSON requests
app.use(express.json({ limit: '50mb' }));

// Main endpoint for HTML to PDF conversion
app.post('/convert', async (req, res) => {
  try {
    const { html, options = {} } = req.body;
    
    if (!html) {
      return res.status(400).json({ 
        success: false, 
        error: 'HTML content is required' 
      });
    }
    
    const pdfBuffer = await convertHtmlToPdf(html, options);
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${options.filename || 'output.pdf'}"`);
    
    // Send the PDF buffer directly to the client
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start the server
app.listen(port, () => {
  console.log(`HTML to PDF service listening on port ${port}`);
});
```

### 2. Conversion Logic
Implement the main conversion function:

```javascript
async function convertHtmlToPdf(html, options = {}) {
  let browser;
  try {
    // Launch a headless browser
    browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: true,
    });

    const page = await browser.newPage();
    
    // Set content to the page
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Generate PDF with provided options
    const pdfBuffer = await page.pdf({
      format: options.format || 'A4',
      orientation: options.orientation || 'portrait',
      margin: options.margin || { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' },
      printBackground: options.printBackground !== undefined ? options.printBackground : true,
      scale: options.scale || 1,
      headerTemplate: options.headerTemplate || '',
      footerTemplate: options.footerTemplate || '',
    });
    
    return pdfBuffer;
  } catch (error) {
    console.error('Error in PDF conversion:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { convertHtmlToPdf };
```

### 3. Error Handling
Implement comprehensive error handling for the API:

```javascript
// Middleware for request validation
app.use('/convert', (req, res, next) => {
  const { html } = req.body;
  
  if (!html) {
    return res.status(400).json({
      success: false,
      error: 'HTML content is required'
    });
  }
  
  // Check HTML content size
  if (html.length > 10 * 1024 * 1024) { // 10MB limit
    return res.status(400).json({
      success: false,
      error: 'HTML content exceeds maximum size (10MB)'
    });
  }
  
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

**Git Step:** After implementing the method changes, commit with message "Implement HTML to PDF conversion logic with direct response"

## Test Changes

### 1. Unit Tests
Create unit tests for the conversion function:

```javascript
const { expect } = require('chai');
const sinon = require('sinon');
const { convertHtmlToPdf } = require('../src/converter');

describe('HTML to PDF Conversion', () => {
  it('should launch puppeteer with correct options', async () => {
    // Setup mocks for puppeteer
    const puppeteerMock = {
      launch: sinon.stub().resolves({
        newPage: sinon.stub().resolves({
          setContent: sinon.stub().resolves(),
          pdf: sinon.stub().resolves(Buffer.from('fake-pdf')),
        }),
        close: sinon.stub().resolves(),
      }),
    };
    
    // Test with mock and assertions
  });
  
  it('should apply default options when not provided', async () => {
    // Test default options
  });
  
  it('should handle errors and close browser', async () => {
    // Test error scenarios
  });
});
```

### 2. Integration Tests
Create integration tests for the API endpoint:

```javascript
const supertest = require('supertest');
const { app } = require('../src/app');
const request = supertest(app);

describe('API Integration Tests', () => {
  it('should convert simple HTML to PDF', async () => {
    const response = await request
      .post('/convert')
      .send({
        html: '<h1>Hello World</h1><p>This is a test document</p>'
      })
      .buffer()
      .parse((res, callback) => {
        const data = [];
        res.on('data', (chunk) => {
          data.push(chunk);
        });
        res.on('end', () => {
          callback(null, Buffer.concat(data));
        });
      });
    
    expect(response.status).to.equal(200);
    expect(response.headers['content-type']).to.equal('application/pdf');
    expect(response.body).to.be.an.instanceof(Buffer);
    expect(response.body.length).to.be.greaterThan(0);
  });
  
  it('should return 400 for missing HTML', async () => {
    const response = await request
      .post('/convert')
      .send({});
    
    expect(response.status).to.equal(400);
    expect(response.body.success).to.be.false;
    expect(response.body.error).to.equal('HTML content is required');
  });
  
  it('should apply custom PDF options', async () => {
    // Test with custom options
  });
});
```

### 3. Performance Testing
Create basic performance tests:

```javascript
describe('Performance Tests', () => {
  it('should handle small HTML documents quickly', async () => {
    const startTime = Date.now();
    await convertHtmlToPdf('<p>Small document</p>');
    const endTime = Date.now();
    
    expect(endTime - startTime).to.be.lessThan(2000); // Should complete in under 2 seconds
  });
  
  it('should handle medium-sized HTML documents', async () => {
    // Generate medium HTML and test
  });
  
  it('should handle concurrent requests', async () => {
    const promises = Array(3).fill().map(() => convertHtmlToPdf('<p>Concurrent test</p>'));
    await Promise.all(promises);
    // Assert successful completion
  });
});
```

**Git Step:** After implementing the test suite, commit with message "Add unit, integration, and performance tests for HTML to PDF function"

## Self-Validation

Before deploying the service, it's essential to validate the implementation:

1. **Local Testing**:
   - Run the service locally
   - Test with various HTML inputs and formatting options
   - Verify PDF outputs are correctly formatted
   - Check error handling for malformed inputs

2. **Performance Validation**:
   - Measure memory usage during PDF generation
   - Track time taken for conversion with various HTML sizes
   - Optimize if needed (e.g., reduce browser launch time)

3. **Security Checks**:
   - Review for any potential security vulnerabilities
   - Ensure proper input sanitization
   - Validate that user-provided HTML can't execute harmful scripts
   - Implement rate limiting to prevent abuse

4. **Docker Testing**:
   - Test the service in a Docker container
   - Verify performance and resource usage in containerized environment
   - Ensure dependencies are correctly installed

**Git Step:** After completing self-validation, commit with message "Complete self-validation and performance optimization"

## README Clean

Create a comprehensive README.md for the project:

```markdown
# HTML to PDF Converter

A simple service that converts HTML content to PDF.

## Features

- Converts HTML content to PDF
- Returns PDF directly to the user
- Customizable PDF formatting options
- Easy to deploy as standalone service

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/html-to-pdf.git
cd html-to-pdf

# Install dependencies
npm install

# Start the service
npm start
```

## Usage

### API Endpoint

Send a POST request to the conversion endpoint:

```
POST http://localhost:3000/convert
```

### Request Format

```json
{
  "html": "<h1>Your HTML Content</h1>",
  "options": {
    "format": "A4",
    "orientation": "portrait",
    "margin": {
      "top": "1cm",
      "right": "1cm",
      "bottom": "1cm",
      "left": "1cm"
    },
    "printBackground": true,
    "filename": "your-custom-filename.pdf"
  }
}
```

### Response

The service returns the PDF file directly as a downloadable attachment.

## Docker Deployment

```bash
# Build the Docker image
docker build -t html-to-pdf .

# Run the container
docker run -p 3000:3000 html-to-pdf
```

## Configuration

The service can be configured using environment variables:

- `PORT`: Port to run the server on (default: 3000)
- `NODE_ENV`: Environment mode (development/production)
- `MAX_CONCURRENT`: Maximum concurrent PDF generations (default: 5)

## Development

1. Install dependencies: `npm install`
2. Run tests: `npm test`
3. Start in development mode: `npm run dev`

## License

MIT
```

**Git Step:** After finalizing the README and documentation, commit with message "Add comprehensive README and usage documentation"

---

By following this implementation plan and committing changes after each step, you'll create a simple HTML to PDF conversion service that can be easily deployed from the GitHub repository to any hosting platform. The service is designed to directly return the PDF to the user without any intermediate storage steps.