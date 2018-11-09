const path = require('path');
const appRoot = path.join(__dirname, '..', '..');

exports.load = resolvedPath => require('electron-compile').init(appRoot, resolvedPath);
