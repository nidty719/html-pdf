/**
 * Unit tests for middleware functions
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { validateRequest, errorHandler, notFoundHandler } = require('../../src/middleware');

describe('Middleware Functions', () => {
  describe('validateRequest', () => {
    let req, res, next;
    
    beforeEach(() => {
      req = { body: {} };
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub().returnsThis()
      };
      next = sinon.spy();
    });
    
    it('should call next() if HTML content is provided', () => {
      req.body.html = '<h1>Test</h1>';
      
      validateRequest(req, res, next);
      
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
    });
    
    it('should return 400 if HTML content is missing', () => {
      validateRequest(req, res, next);
      
      expect(next.called).to.be.false;
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.include({
        success: false,
        error: 'HTML content is required'
      });
    });
    
    it('should return 400 if HTML content exceeds size limit', () => {
      // Create HTML content larger than 10MB
      const largeHtml = 'a'.repeat(11 * 1024 * 1024);
      req.body.html = largeHtml;
      
      validateRequest(req, res, next);
      
      expect(next.called).to.be.false;
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.include({
        success: false,
        error: 'HTML content exceeds maximum size (10MB)'
      });
    });
  });
  
  describe('errorHandler', () => {
    let req, res, next, error;
    
    beforeEach(() => {
      req = {};
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub().returnsThis()
      };
      next = sinon.spy();
      error = new Error('Test error');
    });
    
    it('should return 500 status with error message in development', () => {
      process.env.NODE_ENV = 'development';
      
      errorHandler(error, req, res, next);
      
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.include({
        success: false,
        error: 'Internal server error',
        message: 'Test error'
      });
    });
    
    it('should hide error message in production', () => {
      process.env.NODE_ENV = 'production';
      
      errorHandler(error, req, res, next);
      
      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.include({
        success: false,
        error: 'Internal server error'
      });
      expect(res.json.firstCall.args[0].message).to.be.undefined;
    });
  });
  
  describe('notFoundHandler', () => {
    let req, res;
    
    beforeEach(() => {
      req = {
        method: 'GET',
        path: '/nonexistent'
      };
      res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub().returnsThis()
      };
    });
    
    it('should return 404 with appropriate error message', () => {
      notFoundHandler(req, res);
      
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.json.firstCall.args[0]).to.deep.include({
        success: false,
        error: 'Resource not found',
        message: 'Cannot GET /nonexistent'
      });
    });
  });
});