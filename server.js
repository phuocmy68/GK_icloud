const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
// ... các đoạn code phía dưới giữ nguyên
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const { engine } = require('express-handlebars');
const { BookRead, BookWrite } = require('./models/Book');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Cấu hình Handlebars View Engine
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

// 2. Cấu hình Stateless Session lưu trữ tập trung trên MongoDB Atlas
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_WRITE_URI,
    collectionName: 'sessions'
  }),
  cookie: { maxAge: 1000 * 60 * 60 } // 1 giờ
}));

// Tính toán tham số cá nhân
const mssv = process.env.MSSV || '211234567';
const lastDigit = parseInt(mssv.slice(-1));
const vatRate = lastDigit + 6; // Thuế VAT (%)
const mssvPrefix = mssv.slice(-3); // 3 số cuối MSSV

// Truyền biến cho layout Handlebars
app.use((req, res, next) => {
  res.locals.studentInfo = {
    hoTen: process.env.HO_TEN || 'Nguyễn Văn A',
    mssv: mssv,
    vatRate: vatRate
  };
  next();
});

// Route GET: Đọc danh sách sách (Điều hướng vào Read Account)
app.get('/books', async (req, res) => {
  try {
    const books = await BookRead.find().lean();
    res.render('home', { books });
  } catch (err) {
    res.status(500).send("Lỗi đọc dữ liệu: " + err.message);
  }
});

// Route POST: Thêm mới sách (Điều hướng vào Write Account)
app.post('/books', async (req, res) => {
  const { bookCode, title, basePrice } = req.body;

  // Kiểm tra bộ lọc tiền tố Mã sách
  if (!bookCode.startsWith(mssvPrefix)) {
    return res.status(400).send(`Lỗi: Mã sản phẩm phải bắt đầu bằng 3 số cuối MSSV (${mssvPrefix})`);
  }

  // Tính giá sau thuế
  const price = parseFloat(basePrice);
  const finalPrice = price + (price * (vatRate / 100));

  try {
    const newBook = new BookWrite({
      bookCode,
      title,
      basePrice: price,
      finalPrice: finalPrice
    });
    await newBook.save();
    res.redirect('/books');
  } catch (err) {
    res.status(500).send("Lỗi ghi dữ liệu: " + err.message);
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log(`Server running on port ${process.env.PORT || 3000}`);
});