/**
 * Integration tests for PDF to Images conversion API
 */

const chai = require('chai');
const { expect } = chai;
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');

// Mock the Cloud Functions framework for testing
const mockHttp = (handler) => {
  return async (req) => {
    const res = {
      _status: 200,
      _headers: {},
      _body: null,
      status(code) {
        this._status = code;
        return this;
      },
      set(key, value) {
        this._headers[key] = value;
        return this;
      },
      setHeader(key, value) {
        this._headers[key] = value;
        return this;
      },
      json(data) {
        this._headers['Content-Type'] = 'application/json';
        this._body = data;
        return this;
      },
      send(data) {
        this._body = data;
        return this;
      }
    };

    await handler(req, res);
    return res;
  };
};

describe('PDF to Images API Integration', () => {
  let htmlToPdf;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Clear module cache to get fresh instance
    delete require.cache[require.resolve('../../index.js')];
    
    // Mock the functions framework
    const mockFunctions = {
      http: (name, handler) => {
        htmlToPdf = mockHttp(handler);
      }
    };
    sandbox.stub(require.cache[require.resolve('@google-cloud/functions-framework')], 'exports', mockFunctions);
    
    // Now require the module to register the function
    require('../../index.js');
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('POST /convert with PDF to Images', () => {
    it('should convert PDF to images via JSON request', async function() {
      this.timeout(30000);

      // Create a simple test PDF
      const pdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n196\n%%EOF';
      const pdfBase64 = Buffer.from(pdfContent).toString('base64');

      const req = {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: {
          conversionType: 'pdfToImages',
          pdf: pdfBase64,
          options: {
            format: 'png',
            dpi: 150
          }
        }
      };

      try {
        const res = await htmlToPdf(req);

        expect(res._status).to.equal(200);
        expect(res._headers['Content-Type']).to.equal('application/json');
        expect(res._body).to.be.an('object');
        expect(res._body.success).to.be.true;
        expect(res._body.imageCount).to.be.at.least(1);
        expect(res._body.format).to.equal('png');
        expect(res._body.images).to.be.an('array');
        
        res._body.images.forEach((image, index) => {
          expect(image).to.have.property('page', index + 1);
          expect(image).to.have.property('data');
          expect(image).to.have.property('mimeType', 'image/png');
          expect(image.data).to.be.a('string'); // Base64 encoded
        });
      } catch (error) {
        // Skip if puppeteer fails in test environment
        if (error.message && (error.message.includes('Failed to launch') || error.message.includes('browser'))) {
          this.skip();
        } else {
          throw error;
        }
      }
    });

    it('should handle PDF file upload for conversion to images', async function() {
      this.timeout(30000);

      const pdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n196\n%%EOF';
      const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
      
      const formData = [
        `------${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.pdf"',
        'Content-Type: application/pdf',
        '',
        pdfContent,
        `------${boundary}`,
        'Content-Disposition: form-data; name="conversionType"',
        '',
        'pdfToImages',
        `------${boundary}`,
        'Content-Disposition: form-data; name="options"',
        '',
        JSON.stringify({ format: 'jpeg', quality: 90 }),
        `------${boundary}--`
      ].join('\r\n');

      const req = {
        method: 'POST',
        headers: {
          'content-type': `multipart/form-data; boundary=----${boundary}`
        },
        rawBody: Buffer.from(formData)
      };

      try {
        const res = await htmlToPdf(req);

        expect(res._status).to.equal(200);
        expect(res._headers['Content-Type']).to.equal('application/json');
        expect(res._body).to.be.an('object');
        expect(res._body.success).to.be.true;
        expect(res._body.format).to.equal('jpeg');
        expect(res._body.images).to.be.an('array');
        
        res._body.images.forEach(image => {
          expect(image.mimeType).to.equal('image/jpeg');
        });
      } catch (error) {
        if (error.message && (error.message.includes('Failed to launch') || error.message.includes('browser'))) {
          this.skip();
        } else {
          throw error;
        }
      }
    });

    it('should return error for invalid PDF content', async function() {
      this.timeout(10000);

      const req = {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: {
          conversionType: 'pdfToImages',
          pdf: Buffer.from('This is not a valid PDF').toString('base64')
        }
      };

      const res = await htmlToPdf(req);

      expect(res._status).to.equal(500);
      expect(res._body).to.be.an('object');
      expect(res._body.success).to.be.false;
      expect(res._body.error).to.equal('Error in conversion');
    });

    it('should return error when PDF content is missing', async function() {
      const req = {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: {
          conversionType: 'pdfToImages'
        }
      };

      const res = await htmlToPdf(req);

      expect(res._status).to.equal(400);
      expect(res._body).to.be.an('object');
      expect(res._body.success).to.be.false;
      expect(res._body.error).to.equal('PDF content is required for PDF to images conversion');
    });
  });
});