// config/db.js
const mongoose = require('mongoose');

// Đa luồng kết nối Đọc & Ghi độc lập
const readConn = mongoose.createConnection(process.env.MONGO_READ_URI);
const writeConn = mongoose.createConnection(process.env.MONGO_WRITE_URI);

readConn.on('connected', () => console.log('Read DB Connected'));
writeConn.on('connected', () => console.log('Write DB Connected'));

module.exports = { readConn, writeConn };