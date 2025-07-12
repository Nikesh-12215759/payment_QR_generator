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
  const [theme, setTheme] = useState('light');
  const [showShareOptions, setShowShareOptions] = useState(false);

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.body.className = savedTheme;
  }, []);

  // Handle click outside to close share options
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showShareOptions && !event.target.closest('.qr-container')) {
        setShowShareOptions(false);
      }
    };

    if (showShareOptions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareOptions]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.body.className = newTheme;
  };

  const shareViaWhatsApp = () => {
    const message = `Payment Request: ₹${amount}\n\nScan this QR code to pay:\n${paymentRequest.link}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaEmail = () => {
    const subject = `Payment Request - ₹${amount}`;
    const body = `Hi,\n\nI've sent you a payment request for ₹${amount}.\n\nPlease scan the QR code or click the link below to complete the payment:\n\n${paymentRequest.link}\n\nThank you!`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl);
  };

  const copyPaymentLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentRequest.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy payment link:', err);
    }
  };

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

  const downloadQR = async () => {
    try {
      const qrContainer = document.querySelector('.qr-container');
      if (!qrContainer) return;

      // Create a canvas element with fixed size for better quality
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set canvas size (larger for better quality)
      const canvasSize = 400;
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      
      // Fill with background color
      ctx.fillStyle = theme === 'dark' ? '#2d3748' : '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Get the SVG element (QR code)
      const svg = qrContainer.querySelector('svg');
      if (!svg) return;
      
      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);
      
      // Create image from SVG
      const img = new Image();
      img.onload = () => {
        // Calculate position to center the QR code
        const qrSize = 300; // Larger QR code for better quality
        const x = (canvas.width - qrSize) / 2;
        const y = (canvas.height - qrSize) / 2;
        
        // Draw the QR code
        ctx.drawImage(img, x, y, qrSize, qrSize);
        
        // Convert canvas to blob and download
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `qr-payment-${amount}-${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          URL.revokeObjectURL(svgUrl);
        }, 'image/png', 0.95); // High quality PNG
      };
      img.src = svgUrl;
    } catch (err) {
      console.error('Failed to download QR:', err);
      setError('Failed to download QR code');
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



  return (
    <div className="App">
      <header className="App-header">
        <div className="header-container">
          <h2>💳 Payment Request Generator</h2>
          <button 
            onClick={toggleTheme} 
            className="theme-toggle"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
        
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
              <div className="qr-actions">
                <button 
                  onClick={downloadQR}
                  className="download-btn"
                  title="Download QR Code as PNG"
                >
                  📥 Download QR
                </button>
                <button 
                  onClick={() => setShowShareOptions(!showShareOptions)}
                  className="share-btn"
                  title="Share QR Code"
                >
                  📤 Share
                </button>
              </div>
              
              {showShareOptions && (
                <div className="share-options">
                  <div className="share-header">
                    <span>Share Payment Request</span>
                    <button 
                      onClick={() => setShowShareOptions(false)}
                      className="close-share"
                      title="Close"
                    >
                      ✕
                    </button>
                  </div>
                  <button 
                    onClick={shareViaWhatsApp}
                    className="share-option whatsapp"
                    title="Share via WhatsApp"
                  >
                    💬 WhatsApp
                  </button>
                  <button 
                    onClick={shareViaEmail}
                    className="share-option email"
                    title="Share via Email"
                  >
                    📧 Email
                  </button>
                  <button 
                    onClick={copyPaymentLink}
                    className="share-option copy-link"
                    title="Copy Payment Link"
                  >
                    {copied ? '✅ Copied!' : '🔗 Copy Link'}
                  </button>
                </div>
              )}
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
            <div className="status-badge status-received">
              ✅ Payment Request Generated
            </div>
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
