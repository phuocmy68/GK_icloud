// models/Book.js
const { Schema } = require('mongoose');
const { readConn, writeConn } = require('../config/db');

const bookSchema = new Schema({
  bookCode: { type: String, required: true },
  title: { type: String, required: true },
  basePrice: { type: Number, required: true },
  finalPrice: { type: Number, required: true }
});

// Mapped model tương ứng từng connection
const BookRead = readConn.model('Book', bookSchema);
const BookWrite = writeConn.model('Book', bookSchema);

module.exports = { BookRead, BookWrite };