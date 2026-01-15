# GST Invoice Generator

A professional invoice generation tool for Indian businesses. Generate Tax Invoices and Proforma Invoices with automatic calculations, tax breakdowns and PDF export capabilities.

## Features

### Tax Invoice
- 📊 Automatic calculation of CGST, SGST, and IGST
- 🔢 Multiple line items with HSN/SAC codes
- 💰 Amount to words conversion (Indian format)
- 📄 Original and Duplicate copy generation
- 🏦 Bank details integration
- ⚖️ Optional round-off functionality

### Proforma Invoice
- 📋 Professional proforma invoice format
- 🧮 IGST calculation and tax summary
- 💼 Consignee and Buyer details
- 📦 Delivery and payment terms
- 💳 Bank account details
- ✍️ Authorized signatory section

## Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, or Edge)
- No installation required - runs entirely in the browser!

### Usage

1. **Open the application**
   ```bash
   # Option 1: Open index.html directly in your browser
   # Option 2: Run a local server (recommended)
   python3 -m http.server 8000
   # Then navigate to http://localhost:8000
   ```

2. **Fill in the details**
   - Enter seller/company information
   - Add consignee and buyer details
   - Input line items with quantities and rates
   - Set applicable tax rates (CGST/SGST or IGST)

3. **Preview and Generate**
   - Click "Preview" to see the invoice
   - Review all details
   - Download as PDF (original, duplicate, or both)

## Document Types

### Tax Invoice
Used for actual sales transactions. Includes:
- Comprehensive seller and buyer information
- Detailed line items with HSN/SAC codes
- Tax breakdown (CGST/SGST for intra-state, IGST for inter-state)
- Payment terms and dispatch details
- Original and Duplicate copies for official records

### Proforma Invoice
Used for quotations and advance invoices. Includes:
- Simplified format for estimates
- IGST-based calculations
- Delivery and payment terms
- Bank details for advance payments

## Technical Details

- **Built with**: Vanilla JavaScript, HTML5, CSS3
- **PDF Generation**: jsPDF and html2canvas libraries
- **No Backend**: All processing happens client-side
- **No Data Storage**: Your data stays in your browser

## Project Structure

```
Invoicing/
├── index.html       # Main application file
├── styles.css       # Styling and layout
├── app.js          # Core application logic
└── README.md       # Documentation
```

## Tips

- Use the "Same as Consignee" checkbox to avoid duplicate data entry
- Enable "Round Off" for cleaner total amounts
- Fill in all company details first to save time
- The invoice number and date are editable for your convenience
- Preview before generating PDF to ensure accuracy

## Browser Compatibility

- ✅ Chrome/Edge (Recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Older browsers may have limited PDF generation support

## License

This project is open source and available for personal and commercial use.

## Contributing

Feel free to submit issues or pull requests for improvements!

---

**Note**: This is a client-side application. No data is sent to any server or stored anywhere except temporarily in your browser session.
