// Date utilities for ShopLedger (Indian DD/MM/YYYY format)

function pad2(n) {
  return ('0' + n).slice(-2);
}

exports.today = function () {
  var d = new Date();
  return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + '/' + d.getFullYear();
};

// Accepts either DD/MM/YYYY or YYYY-MM-DD and returns a sortable YYYY-MM-DD key.
exports.normalizeDateKey = function (str) {
  if (!str) return '';
  var s = String(str).trim();
  var parts;
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    parts = s.split('-');
    return parts[0] + '-' + pad2(parts[1]) + '-' + pad2(parts[2]);
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    parts = s.split('/');
    return parts[2] + '-' + pad2(parts[1]) + '-' + pad2(parts[0]);
  }
  return '';
};

exports.getFiscalYear = function (dateStr) {
  var s = exports.normalizeDateKey(dateStr);
  var parts = s.split('-');
  if (parts.length !== 3) return 'FY21-22';
  var month = parseInt(parts[1], 10);
  var year = parseInt(parts[0], 10);
  if (month >= 4) {
    return 'FY' + String(year).slice(-2) + '-' + String(year + 1).slice(-2);
  }
  return 'FY' + String(year - 1).slice(-2) + '-' + String(year).slice(-2);
};
