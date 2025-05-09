# HTML to PDF Converter

A simple service that converts HTML content to PDF format. This service is designed to be lightweight, easy to deploy, and simple to use.

## Features

- Converts HTML content to PDF
- Supports both direct HTML input and HTML file uploads
- Returns PDF directly to the user
- Customizable PDF formatting options
- Easy to deploy as standalone service or Docker container

## Installation

### Local Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/html-to-pdf.git
cd html-to-pdf

# Install dependencies
npm install

# Start the service
npm start
```

The service will be available at http://localhost:3000.

### Docker Setup

```bash
# Build the Docker image
docker build -t html-to-pdf .

# Run the container
docker run -p 3000:3000 html-to-pdf
```

The service will be available at http://localhost:3000.

## Usage

### API Endpoints

- `GET /` - Service information
- `GET /health` - Health check endpoint
- `POST /convert` - Convert HTML to PDF from JSON payload
- `POST /convert/file` - Convert HTML to PDF from uploaded file

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
curl -X POST http://localhost:3000/convert \
  -H "Content-Type: application/json" \
  -d '{"html": "<h1>Hello World</h1>", "options": {"filename": "hello.pdf"}}' \
  -o hello.pdf
```

#### Using cURL with File Upload

```bash
curl -X POST http://localhost:3000/convert/file \
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

## Configuration

The service can be configured using environment variables:

- `PORT` - Port to run the server on (default: 3000)
- `NODE_ENV` - Environment mode (development/production)

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

```bash
npm run dev
```

This will start the service with auto-reloading enabled for changes.

## License

MIT