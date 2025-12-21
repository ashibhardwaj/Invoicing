/**
 * GST Tax Invoice Generator
 * Handles form management, calculations, and PDF generation
 */

// ============================================
// Global State
// ============================================
let items = [];
let itemIdCounter = 0;

// ============================================
// DOM Elements
// ============================================
const elements = {
    form: document.getElementById('invoiceForm'),
    itemsBody: document.getElementById('itemsBody'),
    addItemBtn: document.getElementById('addItemBtn'),
    previewBtn: document.getElementById('previewBtn'),
    generateBtn: document.getElementById('generateBtn'),
    previewModal: document.getElementById('previewModal'),
    closeModal: document.getElementById('closeModal'),
    invoicePreview: document.getElementById('invoicePreview'),
    downloadOriginal: document.getElementById('downloadOriginal'),
    downloadDuplicate: document.getElementById('downloadDuplicate'),
    downloadBoth: document.getElementById('downloadBoth'),
    sameAsConsignee: document.getElementById('sameAsConsignee'),
    buyerFields: document.getElementById('buyerFields'),
    previewTabs: document.querySelectorAll('.preview-tab')
};

// Current preview copy type
let currentCopyType = 'original';

// ============================================
// Initialize
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('invoiceDate').value = today;
    
    // Add first empty item row
    addItemRow();
    
    // Event Listeners
    elements.addItemBtn.addEventListener('click', addItemRow);
    elements.previewBtn.addEventListener('click', showPreview);
    elements.generateBtn.addEventListener('click', () => generatePDF('both'));
    elements.closeModal.addEventListener('click', closePreview);
    elements.downloadOriginal.addEventListener('click', () => generatePDF('original'));
    elements.downloadDuplicate.addEventListener('click', () => generatePDF('duplicate'));
    elements.downloadBoth.addEventListener('click', () => generatePDF('both'));
    elements.sameAsConsignee.addEventListener('change', handleSameAsConsignee);
    
    // Close modal on overlay click
    elements.previewModal.addEventListener('click', (e) => {
        if (e.target === elements.previewModal) {
            closePreview();
        }
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && elements.previewModal.classList.contains('active')) {
            closePreview();
        }
    });
    
    // Preview tab switching
    elements.previewTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active tab
            elements.previewTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Update copy type and re-render
            currentCopyType = tab.dataset.copy;
            renderInvoicePreview();
        });
    });
}

// ============================================
// Item Management
// ============================================
function addItemRow() {
    const itemId = ++itemIdCounter;
    items.push({
        id: itemId,
        description: '',
        hsn: '',
        quantity: '',
        unit: 'Pcs.',
        rate: '',
        amount: 0
    });
    
    renderItems();
}

function removeItem(itemId) {
    items = items.filter(item => item.id !== itemId);
    if (items.length === 0) {
        addItemRow();
    } else {
        renderItems();
    }
}

function updateItem(itemId, field, value) {
    const item = items.find(i => i.id === itemId);
    if (item) {
        item[field] = value;
        
        // Calculate amount if quantity and rate are set
        if (field === 'quantity' || field === 'rate') {
            const qty = parseFloat(item.quantity) || 0;
            const rate = parseFloat(item.rate) || 0;
            item.amount = qty * rate;
        }
        
        // Update display
        const amountCell = document.querySelector(`[data-item-id="${itemId}"] .amount-cell`);
        if (amountCell) {
            amountCell.textContent = item.amount > 0 ? formatCurrency(item.amount) : '';
        }
    }
}

function renderItems() {
    elements.itemsBody.innerHTML = items.map((item, index) => `
        <tr data-item-id="${item.id}">
            <td class="col-sno">${index + 1}</td>
            <td class="col-desc">
                <input type="text" 
                       value="${escapeHtml(item.description)}" 
                       placeholder="Product/Service description"
                       onchange="updateItem(${item.id}, 'description', this.value)">
            </td>
            <td class="col-hsn">
                <input type="text" 
                       value="${escapeHtml(item.hsn)}" 
                       placeholder="HSN Code"
                       onchange="updateItem(${item.id}, 'hsn', this.value)">
            </td>
            <td class="col-qty">
                <input type="number" 
                       value="${item.quantity}" 
                       placeholder="Qty"
                       step="0.01"
                       onchange="updateItem(${item.id}, 'quantity', this.value)">
            </td>
            <td class="col-unit">
                <input type="text" 
                       value="${escapeHtml(item.unit)}" 
                       placeholder="Unit"
                       onchange="updateItem(${item.id}, 'unit', this.value)">
            </td>
            <td class="col-rate">
                <input type="number" 
                       value="${item.rate}" 
                       placeholder="Rate"
                       step="0.01"
                       onchange="updateItem(${item.id}, 'rate', this.value)">
            </td>
            <td class="col-amount amount-cell">${item.amount > 0 ? formatCurrency(item.amount) : ''}</td>
            <td class="col-action">
                <button type="button" class="btn btn-remove" onclick="removeItem(${item.id})">×</button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// Same as Consignee Handler
// ============================================
function handleSameAsConsignee(e) {
    const buyerInputs = elements.buyerFields.querySelectorAll('input, textarea');
    
    if (e.target.checked) {
        // Copy consignee values to buyer
        document.getElementById('buyerName').value = document.getElementById('consigneeName').value;
        document.getElementById('buyerAddress').value = document.getElementById('consigneeAddress').value;
        document.getElementById('buyerGSTIN').value = document.getElementById('consigneeGSTIN').value;
        document.getElementById('buyerState').value = document.getElementById('consigneeState').value;
        
        // Disable buyer fields
        buyerInputs.forEach(input => input.disabled = true);
    } else {
        // Enable buyer fields
        buyerInputs.forEach(input => input.disabled = false);
    }
}

// ============================================
// Calculations
// ============================================
function calculateTotals() {
    const subtotal = items.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    const cgstRate = parseFloat(document.getElementById('cgstRate').value) || 0;
    const sgstRate = parseFloat(document.getElementById('sgstRate').value) || 0;
    const igstRate = parseFloat(document.getElementById('igstRate').value) || 0;
    
    const cgst = subtotal * (cgstRate / 100);
    const sgst = subtotal * (sgstRate / 100);
    const igst = subtotal * (igstRate / 100);
    
    let total = subtotal + cgst + sgst + igst;
    let roundOff = 0;
    
    if (document.getElementById('roundOff').checked) {
        const roundedTotal = Math.round(total);
        roundOff = roundedTotal - total;
        total = roundedTotal;
    }
    
    const totalQuantity = items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        return sum + qty;
    }, 0);
    
    return {
        subtotal,
        cgst,
        sgst,
        igst,
        cgstRate,
        sgstRate,
        igstRate,
        roundOff,
        total,
        totalQuantity
    };
}

// ============================================
// Number to Words (Indian Format)
// ============================================
function numberToWords(num) {
    if (num === 0) return 'Zero';
    
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
                  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
                  'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    function convertLessThanThousand(n) {
        if (n === 0) return '';
        
        if (n < 20) return ones[n];
        
        if (n < 100) {
            return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
        }
        
        return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    }
    
    function convert(n) {
        if (n === 0) return '';
        
        let result = '';
        
        // Crores (10,000,000)
        if (n >= 10000000) {
            result += convertLessThanThousand(Math.floor(n / 10000000)) + ' Crore ';
            n %= 10000000;
        }
        
        // Lakhs (100,000)
        if (n >= 100000) {
            result += convertLessThanThousand(Math.floor(n / 100000)) + ' Lakh ';
            n %= 100000;
        }
        
        // Thousands
        if (n >= 1000) {
            result += convertLessThanThousand(Math.floor(n / 1000)) + ' Thousand ';
            n %= 1000;
        }
        
        // Hundreds and below
        if (n > 0) {
            result += convertLessThanThousand(n);
        }
        
        return result.trim();
    }
    
    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    
    let words = 'Indian Rupees ' + convert(rupees);
    
    if (paise > 0) {
        words += ' and ' + convert(paise) + ' Paise';
    }
    
    return words + ' Only';
}

// ============================================
// Generate Item Rows (Always 10 rows)
// ============================================
function generateItemRows(validItems) {
    const totalRows = 10;
    let rows = '';
    
    // Add filled item rows
    for (let i = 0; i < totalRows; i++) {
        if (i < validItems.length) {
            const item = validItems[i];
            rows += `
                <div class="item-row">
                    <div class="col-sno-prev">${i + 1}</div>
                    <div class="col-desc-prev">${escapeHtml(item.description) || ''}</div>
                    <div class="col-hsn-prev">${escapeHtml(item.hsn) || ''}</div>
                    <div class="col-qty-prev">${item.quantity || ''}</div>
                    <div class="col-rate-prev">${item.rate ? formatCurrency(parseFloat(item.rate)) : ''}</div>
                    <div class="col-per-prev">${escapeHtml(item.unit) || ''}</div>
                    <div class="col-amount-prev">${item.amount ? formatCurrency(item.amount) : ''}</div>
                </div>
            `;
        } else {
            // Add empty row (no serial number)
            rows += `
                <div class="item-row">
                    <div class="col-sno-prev">&nbsp;</div>
                    <div class="col-desc-prev">&nbsp;</div>
                    <div class="col-hsn-prev">&nbsp;</div>
                    <div class="col-qty-prev">&nbsp;</div>
                    <div class="col-rate-prev">&nbsp;</div>
                    <div class="col-per-prev">&nbsp;</div>
                    <div class="col-amount-prev">&nbsp;</div>
                </div>
            `;
        }
    }
    
    return rows;
}

// ============================================
// Invoice Preview
// ============================================
function showPreview() {
    renderInvoicePreview();
    elements.previewModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePreview() {
    elements.previewModal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Reset to original tab
    currentCopyType = 'original';
    elements.previewTabs.forEach(tab => {
        tab.classList.toggle('active', tab.dataset.copy === 'original');
    });
}

function getFormData() {
    return {
        // Seller
        sellerName: document.getElementById('sellerName').value,
        sellerAddress: document.getElementById('sellerAddress').value,
        sellerGSTIN: document.getElementById('sellerGSTIN').value,
        sellerState: document.getElementById('sellerState').value,
        sellerEmail: document.getElementById('sellerEmail').value,
        sellerPhone: document.getElementById('sellerPhone').value,
        
        // Invoice Details
        invoiceNo: document.getElementById('invoiceNo').value,
        invoiceDate: document.getElementById('invoiceDate').value,
        paymentTerms: document.getElementById('paymentTerms').value,
        supplierRef: document.getElementById('supplierRef').value,
        buyerOrderNo: document.getElementById('buyerOrderNo').value,
        buyerOrderDate: document.getElementById('buyerOrderDate').value,
        despatchThrough: document.getElementById('despatchThrough').value,
        destination: document.getElementById('destination').value,
        
        // Consignee
        consigneeName: document.getElementById('consigneeName').value,
        consigneeAddress: document.getElementById('consigneeAddress').value,
        consigneeGSTIN: document.getElementById('consigneeGSTIN').value,
        consigneeState: document.getElementById('consigneeState').value,
        
        // Buyer
        buyerName: document.getElementById('buyerName').value,
        buyerAddress: document.getElementById('buyerAddress').value,
        buyerGSTIN: document.getElementById('buyerGSTIN').value,
        buyerState: document.getElementById('buyerState').value,
        
        // Bank
        bankName: document.getElementById('bankName').value,
        accountNo: document.getElementById('accountNo').value,
        ifscCode: document.getElementById('ifscCode').value,
        branchName: document.getElementById('branchName').value,
        
        // Additional
        declaration: document.getElementById('declaration').value || 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.',
        jurisdiction: document.getElementById('jurisdiction').value
    };
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
}

function renderInvoicePreview() {
    const data = getFormData();
    const totals = calculateTotals();
    const validItems = items.filter(item => item.description || item.amount > 0);
    
    // Get unique HSN codes for tax summary
    const hsnSummary = {};
    validItems.forEach(item => {
        const hsn = item.hsn || 'N/A';
        if (!hsnSummary[hsn]) {
            hsnSummary[hsn] = 0;
        }
        hsnSummary[hsn] += item.amount || 0;
    });
    
    // Determine copy type text
    const copyTypeText = currentCopyType === 'duplicate' 
        ? 'DUPLICATE FOR TRANSPORTER' 
        : 'ORIGINAL FOR RECIPIENT';
    
    elements.invoicePreview.innerHTML = `
        <div class="invoice-header">
            <span class="original-text">(${copyTypeText})</span>
            TAX INVOICE
        </div>
        
        <div class="invoice-top-section">
            <div class="seller-section">
                <div class="seller-header">
                    <img src="logo.png" alt="ACU Logo" class="company-logo">
                    <div class="seller-name">${escapeHtml(data.sellerName) || 'Company Name'}</div>
                </div>
                <div>${escapeHtml(data.sellerAddress) || 'Company Address'}</div>
                ${data.sellerGSTIN ? `<div>GSTIN/UIN: ${escapeHtml(data.sellerGSTIN)}</div>` : ''}
                ${data.sellerState ? `<div>State Name: ${escapeHtml(data.sellerState)}</div>` : ''}
                ${data.sellerEmail ? `<div>E-Mail: ${escapeHtml(data.sellerEmail)}</div>` : ''}
                ${data.sellerPhone ? `<div>Phone: ${escapeHtml(data.sellerPhone)}</div>` : ''}
            </div>
            <div class="invoice-meta-section">
                <div class="invoice-meta-row">
                    <div class="invoice-meta-cell">
                        <div class="label">Invoice No.</div>
                        <div class="value">${escapeHtml(data.invoiceNo) || '-'}</div>
                    </div>
                    <div class="invoice-meta-cell">
                        <div class="label">Dated</div>
                        <div class="value">${formatDate(data.invoiceDate) || '-'}</div>
                    </div>
                </div>
                <div class="invoice-meta-row">
                    <div class="invoice-meta-cell">
                        <div class="label">Mode/Terms of Payment</div>
                        <div class="value">${escapeHtml(data.paymentTerms) || '-'}</div>
                    </div>
                    <div class="invoice-meta-cell">
                        <div class="label">Supplier's Ref.</div>
                        <div class="value">${escapeHtml(data.supplierRef) || '-'}</div>
                    </div>
                </div>

                <div class="invoice-meta-row">
                    <div class="invoice-meta-cell">
                        <div class="label">Buyer's Order No.</div>
                        <div class="value">${escapeHtml(data.buyerOrderNo) || '-'}</div>
                    </div>
                    <div class="invoice-meta-cell">
                        <div class="label">Dated</div>
                        <div class="value">${formatDate(data.buyerOrderDate) || '-'}</div>
                    </div>
                </div>
                <div class="invoice-meta-row">
                    <div class="invoice-meta-cell">
                        <div class="label">Despatched Through</div>
                        <div class="value">${escapeHtml(data.despatchThrough) || '-'}</div>
                    </div>
                    <div class="invoice-meta-cell">
                        <div class="label">Destination</div>
                        <div class="value">${escapeHtml(data.destination) || '-'}</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="consignee-buyer-section">
            <div class="consignee-box">
                <div class="box-title">Consignee (Ship to)</div>
                <div><strong>${escapeHtml(data.consigneeName) || 'Consignee Name'}</strong></div>
                <div>${escapeHtml(data.consigneeAddress) || 'Consignee Address'}</div>
                ${data.consigneeGSTIN ? `<div>GSTIN/UIN: ${escapeHtml(data.consigneeGSTIN)}</div>` : ''}
                ${data.consigneeState ? `<div>State Name: ${escapeHtml(data.consigneeState)}</div>` : ''}
            </div>
            <div class="buyer-box">
                <div class="box-title">Buyer (Bill to)</div>
                <div><strong>${escapeHtml(data.buyerName) || 'Buyer Name'}</strong></div>
                <div>${escapeHtml(data.buyerAddress) || 'Buyer Address'}</div>
                ${data.buyerGSTIN ? `<div>GSTIN/UIN: ${escapeHtml(data.buyerGSTIN)}</div>` : ''}
                ${data.buyerState ? `<div>State Name: ${escapeHtml(data.buyerState)}</div>` : ''}
            </div>
        </div>
        
        <div class="items-section">
            <div class="items-header">
                <div class="col-sno-prev">SI No.</div>
                <div class="col-desc-prev">Description of Goods</div>
                <div class="col-hsn-prev">HSN/SAC</div>
                <div class="col-qty-prev">Quantity</div>
                <div class="col-rate-prev">Rate</div>
                <div class="col-per-prev">Per</div>
                <div class="col-amount-prev">Amount</div>
            </div>
            ${generateItemRows(validItems)}
        </div>
        
        <div class="totals-section">
            <div class="total-row">
                <div class="total-label">Subtotal</div>
                <div class="total-value">${formatCurrency(totals.subtotal)}</div>
            </div>
            ${totals.cgst > 0 ? `
            <div class="total-row">
                <div class="total-label">CGST @ ${totals.cgstRate}%</div>
                <div class="total-value">${formatCurrency(totals.cgst)}</div>
            </div>
            ` : ''}
            ${totals.sgst > 0 ? `
            <div class="total-row">
                <div class="total-label">SGST @ ${totals.sgstRate}%</div>
                <div class="total-value">${formatCurrency(totals.sgst)}</div>
            </div>
            ` : ''}
            ${totals.igst > 0 ? `
            <div class="total-row">
                <div class="total-label">IGST @ ${totals.igstRate}%</div>
                <div class="total-value">${formatCurrency(totals.igst)}</div>
            </div>
            ` : ''}
            ${totals.roundOff !== 0 ? `
            <div class="total-row">
                <div class="total-label">Round Off</div>
                <div class="total-value">${totals.roundOff >= 0 ? '' : '(-)'}${formatCurrency(Math.abs(totals.roundOff))}</div>
            </div>
            ` : ''}
            <div class="total-row grand-total">
                <div class="total-label">Total (${formatNumber(totals.totalQuantity)} items)</div>
                <div class="total-value">₹ ${formatCurrency(totals.total)}</div>
            </div>
        </div>
        
        <div class="amount-words">
            <strong>Amount Chargeable (in words):</strong><br>
            ${numberToWords(totals.total)}
        </div>
        
        <div class="tax-summary-section">
            <div class="tax-summary-header">
                <div style="width: 80px;">HSN/SAC</div>
                <div style="flex: 1;">Taxable Value</div>
                ${totals.cgst > 0 ? `<div style="width: 60px;">Central Tax Rate</div><div style="width: 80px;">Amount</div>` : ''}
                ${totals.sgst > 0 ? `<div style="width: 60px;">State Tax Rate</div><div style="width: 80px;">Amount</div>` : ''}
                ${totals.igst > 0 ? `<div style="width: 60px;">IGST Rate</div><div style="width: 80px;">Amount</div>` : ''}
                <div style="width: 90px;">Total Tax</div>
            </div>
            ${Object.entries(hsnSummary).map(([hsn, taxableValue]) => {
                const cgstAmt = taxableValue * (totals.cgstRate / 100);
                const sgstAmt = taxableValue * (totals.sgstRate / 100);
                const igstAmt = taxableValue * (totals.igstRate / 100);
                const totalTax = cgstAmt + sgstAmt + igstAmt;
                return `
                <div class="tax-summary-row">
                    <div style="width: 80px;">${escapeHtml(hsn)}</div>
                    <div style="flex: 1;">${formatCurrency(taxableValue)}</div>
                    ${totals.cgst > 0 ? `<div style="width: 60px;">${totals.cgstRate}%</div><div style="width: 80px;">${formatCurrency(cgstAmt)}</div>` : ''}
                    ${totals.sgst > 0 ? `<div style="width: 60px;">${totals.sgstRate}%</div><div style="width: 80px;">${formatCurrency(sgstAmt)}</div>` : ''}
                    ${totals.igst > 0 ? `<div style="width: 60px;">${totals.igstRate}%</div><div style="width: 80px;">${formatCurrency(igstAmt)}</div>` : ''}
                    <div style="width: 90px;">${formatCurrency(totalTax)}</div>
                </div>
                `;
            }).join('')}
            <div class="tax-summary-row" style="font-weight: bold; border-top: 1px solid #000;">
                <div style="width: 80px;">Total</div>
                <div style="flex: 1;">${formatCurrency(totals.subtotal)}</div>
                ${totals.cgst > 0 ? `<div style="width: 60px;"></div><div style="width: 80px;">${formatCurrency(totals.cgst)}</div>` : ''}
                ${totals.sgst > 0 ? `<div style="width: 60px;"></div><div style="width: 80px;">${formatCurrency(totals.sgst)}</div>` : ''}
                ${totals.igst > 0 ? `<div style="width: 60px;"></div><div style="width: 80px;">${formatCurrency(totals.igst)}</div>` : ''}
                <div style="width: 90px;">${formatCurrency(totals.cgst + totals.sgst + totals.igst)}</div>
            </div>
        </div>
        
        <div class="amount-words" style="font-size: 10px;">
            <strong>Tax Amount (in words):</strong> ${numberToWords(totals.cgst + totals.sgst + totals.igst)}
        </div>
        
        <div class="footer-section">
            <div class="footer-third">
                <div class="declaration-section">
                    <strong>Declaration:</strong><br>
                    ${escapeHtml(data.declaration).replace(/\n/g, '<br>')}
                </div>
            </div>
            <div class="footer-third">
                ${data.bankName ? `
                <div class="bank-details">
                    <strong>Company's Bank Details</strong>
                    <div>Bank Name: ${escapeHtml(data.bankName)}</div>
                    ${data.accountNo ? `<div>A/c No.: ${escapeHtml(data.accountNo)}</div>` : ''}
                    ${data.branchName ? `<div>Branch: ${escapeHtml(data.branchName)}</div>` : ''}
                    ${data.ifscCode ? `<div>IFSC Code: ${escapeHtml(data.ifscCode)}</div>` : ''}
                </div>
                ` : ''}
            </div>
            <div class="footer-third">
                <div class="signature-section">
                    for <strong>${escapeHtml(data.sellerName) || 'Company Name'}</strong>
                    <div class="signature-line">Authorised Signatory</div>
                </div>
            </div>
        </div>
        
        ${data.jurisdiction ? `
        <div class="jurisdiction">
            ${escapeHtml(data.jurisdiction)}
        </div>
        ` : ''}
        
        <div class="computer-generated">
            This is a computer generated invoice
        </div>
    `;
}

// ============================================
// PDF Generation
// ============================================
async function generatePDF(downloadType = 'both') {
    // Show preview first if not already shown
    if (!elements.previewModal.classList.contains('active')) {
        showPreview();
    }
    
    // Wait for images to load
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const { jsPDF } = window.jspdf;
    
    // Show loading state
    const originalText = elements.generateBtn.innerHTML;
    elements.generateBtn.innerHTML = '⏳ Generating...';
    elements.generateBtn.disabled = true;
    
    // Disable all download buttons
    elements.downloadOriginal.disabled = true;
    elements.downloadDuplicate.disabled = true;
    elements.downloadBoth.disabled = true;
    
    try {
        const invoiceElement = elements.invoicePreview;
        
        // Define all copy types
        const allCopyTypes = [
            { key: 'original', label: 'ORIGINAL FOR RECIPIENT', suffix: 'Original' },
            { key: 'duplicate', label: 'DUPLICATE FOR TRANSPORTER', suffix: 'Duplicate' }
        ];
        
        // Filter based on downloadType
        const copyTypes = downloadType === 'both' 
            ? allCopyTypes 
            : allCopyTypes.filter(c => c.key === downloadType);
        
        const invoiceNo = document.getElementById('invoiceNo').value || 'invoice';
        const date = new Date().toISOString().split('T')[0];
        
        for (let i = 0; i < copyTypes.length; i++) {
            // Update the copy type text
            const originalTextElement = invoiceElement.querySelector('.original-text');
            if (originalTextElement) {
                originalTextElement.textContent = `(${copyTypes[i].label})`;
            }
            
            // Wait a bit for DOM update
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Create canvas from the invoice preview
            const canvas = await html2canvas(invoiceElement, {
                scale: 1.5,
                useCORS: true,
                allowTaint: true,
                logging: false,
                backgroundColor: '#ffffff',
                imageTimeout: 0,
                onclone: function(clonedDoc) {
                    const clonedElement = clonedDoc.getElementById('invoicePreview');
                    if (clonedElement) {
                        clonedElement.style.display = 'block';
                    }
                }
            });
            
            // Validate canvas dimensions
            if (!canvas.width || !canvas.height) {
                throw new Error('Failed to capture invoice preview');
            }
            
            // Use JPEG with compression for smaller file size
            const imgData = canvas.toDataURL('image/jpeg', 0.85);
            
            // Create new PDF for each copy
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            
            // Calculate scaling to fit A4 with margins
            const margin = 10;
            const maxWidth = pdfWidth - (margin * 2);
            const maxHeight = pdfHeight - (margin * 2);
            
            const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
            const scaledWidth = imgWidth * ratio;
            const scaledHeight = imgHeight * ratio;
            const imgX = (pdfWidth - scaledWidth) / 2;
            const imgY = margin;
            
            pdf.addImage(imgData, 'JPEG', imgX, imgY, scaledWidth, scaledHeight);
            
            // Generate filename with suffix
            const filename = `${invoiceNo.replace(/[^a-zA-Z0-9]/g, '_')}_${copyTypes[i].suffix}_${date}.pdf`;
            pdf.save(filename);
            
            // Small delay between downloads
            if (i < copyTypes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        // Reset preview to match current tab
        const currentLabel = currentCopyType === 'duplicate' 
            ? 'DUPLICATE FOR TRANSPORTER' 
            : 'ORIGINAL FOR RECIPIENT';
        const originalTextElement = invoiceElement.querySelector('.original-text');
        if (originalTextElement) {
            originalTextElement.textContent = `(${currentLabel})`;
        }
        
    } catch (error) {
        console.error('PDF generation error:', error);
        alert('Error generating PDF: ' + error.message + '\n\nTip: Try running a local server or open in a different browser.');
    } finally {
        elements.generateBtn.innerHTML = originalText;
        elements.generateBtn.disabled = false;
        elements.downloadOriginal.disabled = false;
        elements.downloadDuplicate.disabled = false;
        elements.downloadBoth.disabled = false;
    }
}

// ============================================
// Utility Functions
// ============================================
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-IN').format(num);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

