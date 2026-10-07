const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo').default || require('connect-mongo');
const { engine } = require('express-handlebars');
const { BookRead, BookWrite } = require('./models/Book');

const app = express();

// Body parser - Xử lý dữ liệu gửi từ Form
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 1. Cấu hình Handlebars View Engine
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');
app.set('views', './views');

// 2. Cấu hình Stateless Session lưu trữ tập trung trên MongoDB Atlas (Ghi bằng Write URI)
app.use(session({
  secret: process.env.SESSION_SECRET || 'MySuperSecretKey2026',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_WRITE_URI,
    collectionName: 'sessions'
  }),
  cookie: { maxAge: 1000 * 60 * 60 } // 1 giờ
}));

// 3. Tính toán tham số cá nhân từ MSSV
const mssv = process.env.MSSV || '23IT169';
const lastDigit = parseInt(mssv.slice(-1)) || 0;
const vatRate = lastDigit + 6; // 9 + 6 = 15%
const mssvPrefix = mssv.slice(-3); // '169'

// 4. Middleware truyền biến sinh viên mặc định sang tất cả View Handlebars
app.use((req, res, next) => {
  const hoTen = process.env.HO_TEN || 'Van Thi Phuoc My';
  res.locals.HO_TEN = hoTen;
  res.locals.MSSV = mssv;
  res.locals.vatRate = vatRate;
  res.locals.vatPercent = vatRate;
  res.locals.studentInfo = { hoTen, mssv, vatRate };
  next();
});

// 5. Route GET: Đọc danh sách sách (Dùng tài khoản Read)
app.get('/books', async (req, res) => {
  try {
    const books = await BookRead.find().lean();
    res.render('home', { books });
  } catch (err) {
    res.status(500).send("Lỗi đọc dữ liệu: " + err.message);
  }
});

// 6. Route POST: Thêm mới sách (Dùng tài khoản Write)
app.post('/books', async (req, res) => {
  // Lấy dữ liệu linh hoạt (tự tương thích cả maSach/tenSach/giaGoc lẫn bookCode/title/basePrice)
  const bookCode = req.body.bookCode || req.body.maSach;
  const title = req.body.title || req.body.tenSach;
  const basePrice = req.body.basePrice || req.body.giaGoc;

  // Kiểm tra bộ lọc tiền tố Mã sách (bắt buộc bắt đầu bằng 169)
  if (!bookCode || !bookCode.startsWith(mssvPrefix)) {
    return res.status(400).send(`Lỗi Validation: Mã sách phải bắt đầu bằng 3 số cuối MSSV (${mssvPrefix})`);
  }

  // Tính giá sau thuế (VAT 15%)
  const price = parseFloat(basePrice) || 0;
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

// 7. Khởi chạy Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});