/**
 * Unit tests for the HTML to PDF converter module
 */

const { expect } = require('chai');
const sinon = require('sinon');
const puppeteer = require('puppeteer');
const { convertHtmlToPdf } = require('../../src/converter');

describe('HTML to PDF Converter', () => {
  let browser;
  let page;
  let puppeteerLaunchStub;
  
  beforeEach(() => {
    // Create stubs for puppeteer
    page = {
      setContent: sinon.stub().resolves(),
      pdf: sinon.stub().resolves(Buffer.from('fake-pdf-content'))
    };
    
    browser = {
      newPage: sinon.stub().resolves(page),
      close: sinon.stub().resolves()
    };
    
    puppeteerLaunchStub = sinon.stub(puppeteer, 'launch').resolves(browser);
  });
  
  afterEach(() => {
    puppeteerLaunchStub.restore();
  });

  it('should launch puppeteer with correct options', async () => {
    const html = '<h1>Test</h1>';
    
    await convertHtmlToPdf(html);
    
    expect(puppeteerLaunchStub.calledOnce).to.be.true;
    expect(puppeteerLaunchStub.firstCall.args[0]).to.deep.include({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--disable-extensions'
      ],
      headless: 'new'
    });
  });

  it('should set HTML content with networkidle0 wait option', async () => {
    const html = '<h1>Test</h1>';
    
    await convertHtmlToPdf(html);
    
    expect(page.setContent.calledOnce).to.be.true;
    expect(page.setContent.firstCall.args[0]).to.equal(html);
    expect(page.setContent.firstCall.args[1]).to.deep.include({
      waitUntil: 'networkidle0'
    });
  });

  it('should apply default PDF options when not provided', async () => {
    const html = '<h1>Test</h1>';
    
    await convertHtmlToPdf(html);
    
    expect(page.pdf.calledOnce).to.be.true;
    expect(page.pdf.firstCall.args[0]).to.deep.include({
      format: 'A4',
      orientation: 'portrait',
      printBackground: true,
      scale: 1
    });
  });

  it('should apply custom PDF options when provided', async () => {
    const html = '<h1>Test</h1>';
    const options = {
      format: 'Letter',
      orientation: 'landscape',
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
      printBackground: false,
      scale: 0.8
    };
    
    await convertHtmlToPdf(html, options);
    
    expect(page.pdf.calledOnce).to.be.true;
    expect(page.pdf.firstCall.args[0]).to.deep.include({
      format: 'Letter',
      orientation: 'landscape',
      margin: { top: '2cm', right: '2cm', bottom: '2cm', left: '2cm' },
      printBackground: false,
      scale: 0.8
    });
  });

  it('should close browser even if an error occurs', async () => {
    const html = '<h1>Test</h1>';
    const error = new Error('PDF generation failed');
    
    page.pdf.rejects(error);
    
    try {
      await convertHtmlToPdf(html);
    } catch (err) {
      // Expected to throw
    }
    
    expect(browser.close.calledOnce).to.be.true;
  });

  it('should throw any errors that occur during PDF generation', async () => {
    const html = '<h1>Test</h1>';
    const error = new Error('PDF generation failed');
    
    page.pdf.rejects(error);
    
    try {
      await convertHtmlToPdf(html);
      expect.fail('Should have thrown an error');
    } catch (err) {
      expect(err).to.equal(error);
    }
  });
});