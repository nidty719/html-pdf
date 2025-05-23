# HTML to PDF and PDF to Images Converter

A service that converts HTML content to PDF format and PDF documents to images. This service is designed to be lightweight, easy to deploy, and simple to use. It can be deployed as a standalone Express server, a Docker container, or a Google Cloud Function.

## Features

- Converts HTML content to PDF
- Converts PDF documents to images (PNG, JPEG, WebP)
- Supports both direct HTML/PDF input and file uploads
- Returns PDF directly to the user or base64-encoded images
- Customizable PDF formatting options
- Configurable image conversion settings (format, DPI, quality)
- Multiple deployment options: Express, Docker, or Google Cloud Functions

## Installation

This project offers multiple deployment options to suit your needs.

### Local Setup (Express Server)

```bash
# Clone the repository
git clone https://github.com/nidty719/html-pdf.git
cd html-pdf

# Use the main branch for Express server
git checkout main

# Install dependencies
npm install

# Start the service
npm start
```

The service will be available at http://localhost:3000.

### Docker Setup

```bash
# Clone the repository
git clone https://github.com/nidty719/html-pdf.git
cd html-pdf

# Use the main branch
git checkout main

# Build the Docker image
docker build -t html-to-pdf .

# Run the container
docker run -p 3000:3000 html-to-pdf
```

The service will be available at http://localhost:3000.

### Google Cloud Functions Setup

```bash
# Clone the repository
git clone https://github.com/nidty719/html-pdf.git
cd html-pdf

# Use the cloud-function branch
git checkout cloud-function

# Install dependencies
npm install

# Test locally
npm start
```

The service will be available at http://localhost:8080 for local testing.

#### Deploying to Google Cloud Functions

```bash
# Deploy directly from local machine
npm run deploy

# Or deploy via GitHub integration
1. Connect your GitHub repository to Google Cloud Build
2. Configure the build trigger to use cloudbuild.yaml
3. Push changes to trigger automatic deployment
```

## Usage

### API Endpoints

#### Express Server (main branch)
- `GET /` - Service information
- `GET /health` - Health check endpoint
- `POST /convert` - Convert HTML to PDF from JSON payload
- `POST /convert/file` - Convert HTML to PDF from uploaded file

#### Google Cloud Function (cloud-function branch)
- `POST /` - Single endpoint that handles both JSON payload and file upload
  - For JSON payload: Send body with `html` and optional `options`
  - For file upload: Send multipart/form-data with `htmlFile` and optional `options`
  - For PDF to Images: Include `conversionType: "pdfToImages"` in your request

### Converting HTML to PDF

#### Method 1: Using JSON Payload

Send a POST request to the `/convert` endpoint with the following JSON payload:

```json
{
  "html": "<h1>Your HTML Content</h1><p>This will be converted to PDF</p>",
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

#### Method 2: Using File Upload

Send a multipart/form-data POST request to the `/convert/file` endpoint with:

- An HTML file in the `htmlFile` field
- Optional JSON-formatted options in the `options` field

#### Available Options

- `format` - Paper format (A4, Letter, etc.)
- `orientation` - Portrait or Landscape
- `margin` - Page margins (top, right, bottom, left)
- `headerTemplate` - HTML template for page header
- `footerTemplate` - HTML template for page footer
- `scale` - Scale of the webpage rendering (default: 1)
- `printBackground` - Whether to print background graphics (default: true)
- `filename` - Custom filename for the downloaded PDF (default: output.pdf)

### Examples

#### Using cURL with JSON Payload

```bash
# For Express Server
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Hello World</h1>", "options": {"filename": "hello.pdf"}}' \
  -o hello.pdf

# For Google Cloud Function
curl -X POST https://REGION-PROJECT_ID.cloudfunctions.net/htmlToPdf \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Hello World</h1>", "options": {"filename": "hello.pdf"}}' \
  -o hello.pdf
```

#### Using cURL with File Upload

```bash
# For Express Server
curl -X POST http://localhost:3000/convert/file \
  -F "htmlFile=@/path/to/your/file.html" \
  -F 'options={"format": "Letter", "orientation": "landscape", "filename": "hello.pdf"}' \
  -o hello.pdf

# For Google Cloud Function
curl -X POST https://REGION-PROJECT_ID.cloudfunctions.net/htmlToPdf \
  -F "htmlFile=@/path/to/your/file.html" \
  -F 'options={"format": "Letter", "orientation": "landscape", "filename": "hello.pdf"}' \
  -o hello.pdf
```

### JavaScript Examples

#### Using Fetch with JSON Payload

```javascript
fetch('http://localhost:3000/convert', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    html: '<h1>Hello World</h1>',
    options: {
      filename: 'hello.pdf'
    }
  }),
})
.then(response => response.blob())
.then(blob => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'hello.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
});
```

#### Using FormData for File Upload

```javascript
const formData = new FormData();
const fileInput = document.querySelector('#htmlFileInput');
const options = {
  format: 'A4',
  orientation: 'portrait',
  filename: 'document.pdf'
};

formData.append('htmlFile', fileInput.files[0]);
formData.append('options', JSON.stringify(options));

fetch('http://localhost:3000/convert/file', {
  method: 'POST',
  body: formData
})
.then(response => response.blob())
.then(blob => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = options.filename || 'output.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
});
```

### Converting PDF to Images

The Google Cloud Function version supports converting PDF documents to images. This feature is only available in the cloud-function branch.

#### Method 1: Using JSON Payload with Base64 PDF

Send a POST request with the following JSON payload:

```json
{
  "conversionType": "pdfToImages",
  "pdf": "<base64-encoded-pdf-content>",
  "options": {
    "format": "png",      // Options: "png", "jpeg", "webp"
    "dpi": 150,           // Resolution in DPI (default: 150)
    "quality": 90         // Quality for JPEG/WebP (1-100, default: 90)
  }
}
```

#### Method 2: Using File Upload

Send a multipart/form-data POST request with:

- A PDF file in the `file` field
- Set `conversionType` field to `"pdfToImages"`
- Optional JSON-formatted options in the `options` field

#### Response Format

The API returns a JSON response containing base64-encoded images:

```json
{
  "success": true,
  "imageCount": 3,
  "format": "png",
  "images": [
    {
      "page": 1,
      "data": "<base64-encoded-image-data>",
      "mimeType": "image/png"
    },
    {
      "page": 2,
      "data": "<base64-encoded-image-data>",
      "mimeType": "image/png"
    },
    // ... more pages
  ]
}
```

### Examples for PDF to Images

#### Using cURL with JSON Payload

```bash
# Convert PDF to PNG images
curl -X POST https://REGION-PROJECT_ID.cloudfunctions.net/htmlToPdf \
  -H "Content-Type: application/json" \
  -d '{
    "conversionType": "pdfToImages",
    "pdf": "'$(base64 -i document.pdf)'",
    "options": {
      "format": "png",
      "dpi": 300
    }
  }' \
  -o response.json
```

#### Using cURL with File Upload

```bash
# Upload PDF file and convert to JPEG images
curl -X POST https://REGION-PROJECT_ID.cloudfunctions.net/htmlToPdf \
  -F "file=@/path/to/document.pdf" \
  -F "conversionType=pdfToImages" \
  -F 'options={"format": "jpeg", "quality": 85}' \
  -o response.json
```

#### JavaScript Example for PDF to Images

```javascript
// Convert PDF file to images
async function convertPdfToImages(pdfFile) {
  const formData = new FormData();
  formData.append('file', pdfFile);
  formData.append('conversionType', 'pdfToImages');
  formData.append('options', JSON.stringify({
    format: 'png',
    dpi: 200
  }));

  const response = await fetch('https://REGION-PROJECT_ID.cloudfunctions.net/htmlToPdf', {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  
  if (result.success) {
    // Process each page image
    result.images.forEach((image, index) => {
      // Convert base64 to blob and create download link
      const byteCharacters = atob(image.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: image.mimeType });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `page-${image.page}.${result.format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    });
  }
}
```

## Configuration

### Express Server Configuration

The Express server can be configured using environment variables:

- `PORT` - Port to run the server on (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

### Google Cloud Function Configuration

The Google Cloud Function can be configured during deployment:

- Memory allocation (default: 1024MB)
- Timeout (default: 300s)
- Region (default: us-central1)
- Runtime (Node.js 16)

These settings can be adjusted in the `cloudbuild.yaml` file or when deploying manually.

## Development

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration
```

### Running in Development Mode

#### Express Server (main branch)
```bash
npm run dev
```

#### Google Cloud Function (cloud-function branch)
```bash
npm start
```

This will start the service with auto-reloading enabled for changes.

## GitHub Integration with Google Cloud

To set up automatic deployment from GitHub to Google Cloud Functions:

1. Push your code to GitHub
2. In Google Cloud Console, navigate to Cloud Build > Triggers
3. Connect your GitHub repository
4. Create a new trigger:
   - Name: "Deploy HTML to PDF Function"
   - Event: Push to a branch
   - Source: cloud-function branch
   - Configuration: Cloud Build configuration file (cloudbuild.yaml)
5. Save the trigger

Now, whenever you push to the cloud-function branch, the function will be automatically deployed.

## License

MIT