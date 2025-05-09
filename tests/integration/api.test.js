/**
 * Integration tests for the HTML to PDF API
 */

const { expect } = require('chai');
const supertest = require('supertest');
const sinon = require('sinon');
const puppeteer = require('puppeteer');
const { app } = require('../../src/app');

describe('HTML to PDF API Integration Tests', () => {
  let request;
  let puppeteerLaunchStub;
  let browser;
  let page;
  
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
  });
  
  after(() => {
    puppeteerLaunchStub.restore();
  });
  
  describe('GET /', () => {
    it('should return basic service information', async () => {
      const response = await request.get('/');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an('object');
      expect(response.body).to.have.property('service', 'HTML to PDF Converter');
      expect(response.body).to.have.property('endpoints');
    });
  });
  
  describe('GET /health', () => {
    it('should return OK status', async () => {
      const response = await request.get('/health');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('status', 'ok');
    });
  });
  
  describe('POST /convert', () => {
    it('should convert HTML to PDF and return PDF content', async () => {
      const html = '<h1>Test Document</h1><p>This is a test</p>';
      
      const response = await request
        .post('/convert')
        .send({ html })
        .expect('Content-Type', 'application/pdf')
        .expect('Content-Disposition', 'attachment; filename="output.pdf"');
      
      expect(response.status).to.equal(200);
      expect(response.body).to.be.an.instanceof(Buffer);
      expect(page.setContent.calledWith(html)).to.be.true;
      expect(page.pdf.called).to.be.true;
    });
    
    it('should use custom filename when provided', async () => {
      const html = '<h1>Test Document</h1>';
      const options = { filename: 'custom-name.pdf' };
      
      const response = await request
        .post('/convert')
        .send({ html, options })
        .expect('Content-Disposition', 'attachment; filename="custom-name.pdf"');
      
      expect(response.status).to.equal(200);
    });
    
    it('should return 400 when HTML content is missing', async () => {
      const response = await request
        .post('/convert')
        .send({});
      
      expect(response.status).to.equal(400);
      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error', 'HTML content is required');
    });
    
    it('should handle errors in PDF generation', async () => {
      // Make the PDF generation fail
      const error = new Error('PDF generation failed');
      page.pdf.rejects(error);
      
      const response = await request
        .post('/convert')
        .send({ html: '<h1>Test</h1>' });
      
      expect(response.status).to.equal(500);
      expect(response.body).to.have.property('success', false);
      
      // Reset the stub for other tests
      page.pdf.resolves(Buffer.from('PDF test content'));
    });
  });
  
  describe('Non-existent routes', () => {
    it('should return 404 status with error message', async () => {
      const response = await request.get('/nonexistent');
      
      expect(response.status).to.equal(404);
      expect(response.body).to.have.property('success', false);
      expect(response.body).to.have.property('error', 'Resource not found');
    });
  });
});