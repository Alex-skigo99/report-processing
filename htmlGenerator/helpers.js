/**
 * Helper functions for HTML generation
 */

function escapeHtml(text) {
    if (text === null || text === undefined) {
        return '';
    }
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return String(text).replace(/[&<>"']/g, (m) => map[m]);
}

function formatDate(date) {
    if (!date) return 'N/A';
    
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    
    return d.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

function formatChartDate(dateString) {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

function getStatusClass(status) {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('completed') || statusLower.includes('paid')) {
        return 'status-completed';
    }
    if (statusLower.includes('working')) {
        return 'status-working';
    }
    if (statusLower.includes('waiting')) {
        return 'status-waiting';
    }
    
    return 'status-not-started';
}

module.exports = {
    escapeHtml,
    formatDate,
    formatChartDate,
    formatNumber,
    getStatusClass,
};
