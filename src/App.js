import React, { useState, useEffect } from 'react';
import axios from 'axios';
import QRCode from 'react-qr-code';
import './App.css';

const BACKEND_URL = 'https://payment-app-backend-tkkm.onrender.com';

function App() {
  const [amount, setAmount] = useState('');
  const [app, setApp] = useState('upi');
  const [account, setAccount] = useState({ vpa: '', name: '', username: '' });
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleAccountChange = (e) => {
    setAccount({ ...account, [e.target.name]: e.target.value });
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const resetForm = () => {
    setAmount('');
    setApp('upi');
    setAccount({ vpa: '', name: '', username: '' });
    setPaymentRequest(null);
    setError('');
    setSuccess(false);
    setCopied(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPaymentRequest(null);
    setLoading(true);
    setSuccess(false);
    
    try {
      console.log('Sending request to:', `${BACKEND_URL}/api/request-payment`);
      const reqAccount =
        app === 'upi'
          ? { vpa: account.vpa, name: account.name }
          : { username: account.username };
      const res = await axios.post(`${BACKEND_URL}/api/request-payment`, {
        amount,
        app,
        account: reqAccount,
      });
      console.log('Response received:', res.data);
      setPaymentRequest(res.data);
      setSuccess(true);
    } catch (err) {
      console.error('Error details:', err);
      setError(err.response?.data?.error || `Error creating payment request: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (paymentRequest && paymentRequest.status === 'pending') {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${BACKEND_URL}/api/payment/${paymentRequest.id}`);
          if (res.data.status !== paymentRequest.status) {
            setPaymentRequest(res.data);
          }
        } catch (err) {
          // Optionally handle error
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [paymentRequest]);

  const markAsReceived = async () => {
    try {
      const res = await axios.post(`${BACKEND_URL}/api/payment/${paymentRequest.id}/mark-received`);
      setPaymentRequest(res.data.request);
    } catch (err) {
      setError('Failed to mark as received');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h2>💳 Payment Request Generator</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Amount (₹)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Payment App</label>
            <select value={app} onChange={e => setApp(e.target.value)}>
              <option value="upi">UPI</option>
              <option value="paypal">PayPal</option>
            </select>
          </div>
          
          {app === 'upi' && (
            <>
              <div className="form-group">
                <label>UPI VPA</label>
                <input
                  type="text"
                  name="vpa"
                  value={account.vpa}
                  onChange={handleAccountChange}
                  placeholder="yourname@upi"
                  required={app === 'upi'}
                />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  name="name"
                  value={account.name}
                  onChange={handleAccountChange}
                  placeholder="Your Name"
                  required={app === 'upi'}
                />
              </div>
            </>
          )}
          
          {app === 'paypal' && (
            <div className="form-group">
              <label>PayPal Username</label>
              <input
                type="text"
                name="username"
                value={account.username}
                onChange={handleAccountChange}
                placeholder="your-paypal-username"
                required={app === 'paypal'}
              />
            </div>
          )}
          
          <button type="submit" disabled={loading}>
            {loading ? (
              <>
                Generating QR Code
                <span className="loading"></span>
              </>
            ) : (
              'Generate QR Code'
            )}
          </button>
        </form>
        
        {error && <div className="error">{error}</div>}
        
        {paymentRequest && (
          <div className={`payment-result ${success ? 'success-animation' : ''}`}>
            <h3>📱 Scan to Pay</h3>
            <div className="qr-container">
              <QRCode value={paymentRequest.link} size={180} />
            </div>
            <div className="payment-link">
              <a href={paymentRequest.link} target="_blank" rel="noopener noreferrer">
                {paymentRequest.link}
              </a>
              <button 
                onClick={() => copyToClipboard(paymentRequest.link)}
                className="copy-btn"
                style={{ 
                  marginLeft: '10px', 
                  padding: '5px 10px', 
                  fontSize: '0.8rem',
                  background: copied ? '#48bb78' : '#667eea'
                }}
              >
                {copied ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
            <div className={`status-badge status-${paymentRequest.status}`}>
              {paymentRequest.status === 'pending' ? '⏳ Pending' : '✅ Received'}
            </div>
            {paymentRequest.status === 'pending' && (
              <button onClick={markAsReceived} className="mark-received-btn">
                Mark as Received
              </button>
            )}
            <button onClick={resetForm} className="reset-btn">
              Create New Request
            </button>
          </div>
        )}
        
        {/* Floating Action Button */}
        {!paymentRequest && (
          <div className="fab-container">
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="fab"
              title="Scroll to top"
            >
              ⬆️
            </button>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;
