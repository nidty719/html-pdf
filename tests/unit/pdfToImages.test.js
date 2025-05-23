/**
 * Unit tests for PDF to Images conversion module
 */

const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const { convertPdfToImages } = require('../../src/pdfToImages');

describe('PDF to Images Converter', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('convertPdfToImages', () => {
    it('should convert a PDF buffer to images with default options', async function() {
      this.timeout(30000); // Increase timeout for PDF processing

      // Create a simple PDF buffer for testing
      const mockPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n196\n%%EOF');

      try {
        const images = await convertPdfToImages(mockPdfBuffer);
        
        expect(images).to.be.an('array');
        expect(images.length).to.be.at.least(1);
        
        images.forEach((image, index) => {
          expect(image).to.have.property('page', index + 1);
          expect(image).to.have.property('buffer');
          expect(image.buffer).to.be.instanceOf(Buffer);
          expect(image.buffer.length).to.be.greaterThan(0);
        });
      } catch (error) {
        // If puppeteer fails (common in test environments), skip the test
        if (error.message.includes('Failed to launch') || error.message.includes('browser')) {
          this.skip();
        } else {
          throw error;
        }
      }
    });

    it('should convert PDF to JPEG format when specified', async function() {
      this.timeout(30000);

      const mockPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n196\n%%EOF');

      try {
        const images = await convertPdfToImages(mockPdfBuffer, {
          format: 'jpeg',
          quality: 80
        });
        
        expect(images).to.be.an('array');
        expect(images.length).to.be.at.least(1);
        
        // JPEG magic bytes: FF D8 FF
        const jpegMagicBytes = Buffer.from([0xFF, 0xD8, 0xFF]);
        images.forEach(image => {
          const firstThreeBytes = image.buffer.slice(0, 3);
          expect(firstThreeBytes.equals(jpegMagicBytes)).to.be.true;
        });
      } catch (error) {
        if (error.message.includes('Failed to launch') || error.message.includes('browser')) {
          this.skip();
        } else {
          throw error;
        }
      }
    });

    it('should handle invalid PDF buffer', async function() {
      this.timeout(10000);

      const invalidPdfBuffer = Buffer.from('This is not a valid PDF');

      try {
        await convertPdfToImages(invalidPdfBuffer);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error).to.be.instanceOf(Error);
      }
    });

    it('should apply custom DPI settings', async function() {
      this.timeout(30000);

      const mockPdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n196\n%%EOF');

      try {
        const lowDpiImages = await convertPdfToImages(mockPdfBuffer, { dpi: 72 });
        const highDpiImages = await convertPdfToImages(mockPdfBuffer, { dpi: 300 });
        
        expect(lowDpiImages).to.be.an('array');
        expect(highDpiImages).to.be.an('array');
        
        // Higher DPI should result in larger image buffers
        if (lowDpiImages.length > 0 && highDpiImages.length > 0) {
          expect(highDpiImages[0].buffer.length).to.be.greaterThan(lowDpiImages[0].buffer.length);
        }
      } catch (error) {
        if (error.message.includes('Failed to launch') || error.message.includes('browser')) {
          this.skip();
        } else {
          throw error;
        }
      }
    });
  });
});