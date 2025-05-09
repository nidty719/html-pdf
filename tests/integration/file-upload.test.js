/**
 * Integration tests for HTML file upload and conversion
 */

const { expect } = require('chai');
const supertest = require('supertest');
const sinon = require('sinon');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');
const { app } = require('../../src/app');

describe('HTML File Upload Integration Tests', () => {
  let request;
  let puppeteerLaunchStub;
  let browser;
  let page;
  let testHtmlPath;
  
  before(() => {
    request = supertest(app);
    
    // Create page mock with PDF generation capability
    page = {
      setContent: sinon.stub().resolves(),
      pdf: sinon.stub().resolves(Buffer.from('PDF test content'))
    };
    
    // Create browser mock
    browser = {
      newPage: sinon.stub().resolves(page),
      close: sinon.stub().resolves()
    };
    
    // Stub puppeteer.launch to avoid actually launching a browser
    puppeteerLaunchStub = sinon.stub(puppeteer, 'launch').resolves(browser);
    
    // Create a test HTML file
    const testDir = path.join(__dirname, '../fixtures');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    testHtmlPath = path.join(testDir, 'test.html');
    fs.writeFileSync(testHtmlPath, '<h1>Test HTML File</h1><p>This is a test</p>');
  });
  
  after(() => {
    puppeteerLaunchStub.restore();
    
    // Clean up test file
    if (fs.existsSync(testHtmlPath)) {
      fs.unlinkSync(testHtmlPath);
    }
  });
  
  describe('POST /convert/file', () => {
    it('should convert uploaded HTML file to PDF', async () => {
      const response = await request
        .post('/convert/file')
        .attach('htmlFile', testHtmlPath)
        .expect('Content-Type', 'application/pdf')
        .expect('Content-Disposition', 'attachment; filename="output.pdf"');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an.instanceof(Buffer);
      expect(page.setContent.called).to.be.true;
      expect(page.pdf.called).to.be.true;
    });
    
    it('should use custom options when provided', async () => {
      const options = {
        format: 'Letter',
        orientation: 'landscape',
        filename: 'custom-name.pdf'
      };
      
      const response = await request
        .post('/convert/file')
        .attach('htmlFile', testHtmlPath)
        .field('options', JSON.stringify(options))
        .expect('Content-Disposition', 'attachment; filename="custom-name.pdf"');
      
      expect(response.status).to.equal(200);
      expect(page.pdf.calledWith(sinon.match({
        format: 'Letter',
        orientation: 'landscape'
      }))).to.be.true;
    });
    
    it('should return 400 when no file is uploaded', async () => {
      const response = await request
        .post('/convert/file');
      
      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error', 'No HTML file uploaded');
    });
    
    it('should return error when non-HTML file is uploaded', async () => {
      // Create a temporary text file
      const testTxtPath = path.join(path.dirname(testHtmlPath), 'test.txt');
      fs.writeFileSync(testTxtPath, 'This is not an HTML file');
      
      try {
        const response = await request
          .post('/convert/file')
          .attach('htmlFile', testTxtPath);
        
        expect(response.status).to.equal(400);
        expect(response.body).to.have.property('success', false);
      } finally {
        // Clean up
        if (fs.existsSync(testTxtPath)) {
          fs.unlinkSync(testTxtPath);
        }
      }
    });
  });
});