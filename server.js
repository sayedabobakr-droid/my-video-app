const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public')); // تشغيل ملفات الموقع من مجلد public
app.use('/uploads', express.static('uploads')); // للسماح للمتصفح برؤية الفيديوهات المرفوعة

// إعداد مكان تخزين الفيديوهات على الهارد ديسك
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 1000 } // حد أقصى 1000 ميجا (1 جيجا)
});

// التأكد من وجود المجلدات والملفات المطلوبة
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');
if (!fs.existsSync('database.json')) fs.writeFileSync('database.json', JSON.stringify({ posts: [] }));

// 1. جلب المنشورات
app.get('/api/posts', (req, res) => {
    const data = JSON.parse(fs.readFileSync('database.json'));
    res.json(data.posts);
});

// 2. رفع فيديو أو صورة كبيرة
app.post('/api/upload', upload.single('video'), (req, res) => {
    const data = JSON.parse(fs.readFileSync('database.json'));
    const newPost = {
        id: Date.now().toString(),
        name: req.body.title,
        url: `/uploads/${req.file.filename}`,
        type: req.file.mimetype,
        hearts: 0,
        author: req.body.author
    };
    data.posts.unshift(newPost);
    fs.writeFileSync('database.json', JSON.stringify(data, null, 2));
    res.json({ success: true });
});

// 3. نظام اللايكات
app.post('/api/like', (req, res) => {
    const data = JSON.parse(fs.readFileSync('database.json'));
    const { postId } = req.body;
    const post = data.posts.find(p => p.id === postId);
    if (post) {
        post.hearts++;
        fs.writeFileSync('database.json', JSON.stringify(data, null, 2));
        res.json({ success: true, hearts: post.hearts });
    }
});

// 4. حذف منشور بالاسم (اللي طلبته للملف الشخصي)
app.post('/api/delete', (req, res) => {
    let data = JSON.parse(fs.readFileSync('database.json'));
    const initialCount = data.posts.length;
    data.posts = data.posts.filter(p => p.name !== req.body.name);
    
    if (data.posts.length < initialCount) {
        fs.writeFileSync('database.json', JSON.stringify(data, null, 2));
        res.json({ success: true });
    } else {
        res.status(404).json({ success: false });
    }
});

app.listen(PORT, () => console.log(`السيرفر شغال وجاهز للفيديوهات الكبيرة: http://localhost:${PORT}`));