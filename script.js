// 1. مصفوفة المنشورات (تحميل من السيرفر لضمان السعة الكبيرة)
let database = [];

// --- 2. وظيفة التنقل بين الأقسام (الرئيسية - نشر - بروفايل) ---
function showSection(sectionId) {
    const sections = ['feed-section', 'upload-section', 'profile-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    const target = document.getElementById(sectionId + '-section');
    if (target) target.style.display = 'block';
}

// 3. تسجيل المشتركين
function register() {
    const name = document.getElementById('reg-name').value;
    const phone = document.getElementById('reg-phone').value;
    
    if(name && phone) {
        let allUsers = JSON.parse(localStorage.getItem('allUsers')) || [];
        const newUser = {
            id: Date.now(),
            name: name,
            phone: phone,
            status: 'active'
        };
        
        if (!allUsers.find(u => u.phone === phone)) {
            allUsers.push(newUser);
            localStorage.setItem('allUsers', JSON.stringify(allUsers));
        }

        localStorage.setItem('userLoggedIn', 'true');
        localStorage.setItem('userName', name);
        localStorage.setItem('userPhone', phone);
        checkLogin();
    } else {
        alert("يرجى إدخال الاسم ورقم الهاتف");
    }
}

// 4. التحقق من الدخول
async function checkLogin() {
    let allUsers = JSON.parse(localStorage.getItem('allUsers')) || [];
    const currentPhone = localStorage.getItem('userPhone');
    const userStatus = allUsers.find(u => u.phone === currentPhone);

    if(userStatus && userStatus.status === 'deleted') {
        alert("عذراً، لقد تم إلغاء اشتراكك بواسطة الإدارة!");
        logout();
        return;
    }

    if(localStorage.getItem('userLoggedIn') === 'true') {
        document.getElementById('auth-container').style.display = 'none';
        document.getElementById('main-content').style.display = 'block';
        loadProfile();
        renderFeed();
    }
}

// 5. رفع المحتوى (تمت إضافة خاصية FormData لدعم أحجام حتى 1000MB)
async function uploadContent() {
    const title = document.getElementById('file-title').value;
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];

    if (title && file) {
        // خاصية الـ FormData هي السر في تحمل الأحجام الكبيرة دون انهيار المتصفح
        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', title);
        formData.append('author', localStorage.getItem('userName'));

        alert("بدأ رفع الملف الكبير... يرجى الانتظار وعدم إغلاق الصفحة");

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData 
        });

        if (response.ok) {
            alert("تم الرفع بنجاح ✅");
            renderFeed();
            showSection('feed');
        } else {
            alert("فشل الرفع، تأكد من تشغيل السيرفر ❌");
        }
    }
}

// 6. عرض المنشورات (تجلب البيانات من السيرفر لتعمل عند الجميع)
async function renderFeed() {
    const feed = document.getElementById('main-feed');
    if(!feed) return;
    
    const response = await fetch('/api/posts');
    database = await response.json();
    
    feed.innerHTML = '';
    database.forEach((item, index) => {
        let mediaTag = item.type.includes('video') ? `<video src="${item.url}" controls style="width:100%"></video>` : 
                       item.type.includes('image') ? `<img src="${item.url}" style="width:100%">` : 
                       `<div style="font-size:50px">📄</div>`;

        feed.innerHTML += `
            <div class="video-card">
                <small style="color: #888">بواسطة: ${item.author || 'مجهول'}</small>
                ${mediaTag}
                <h4>${item.name}</h4>
                <button onclick="addHeart('${item.id}')" style="width:auto">❤️ <span id="like-${item.id}">${item.hearts}</span></button>
            </div>`;
    });
}

// --- ميزة الحذف داخل الملف الشخصي (ترسل أمر الحذف للسيرفر) ---
function loadProfile() {
    const display = document.getElementById('user-info-display');
    if(display) {
        display.innerHTML = `
            <h4>الاسم: ${localStorage.getItem('userName')}</h4>
            <p>الهاتف: ${localStorage.getItem('userPhone')}</p>
            <hr style="border: 0.1px solid #333; margin: 20px 0;">
            <div style="text-align: right;">
                <label>اسم المنشور المراد حذفه:</label>
                <input type="text" id="delete-post-name" placeholder="اكتب اسم المنشور هنا..." style="width:100%; margin: 10px 0; padding: 10px; border-radius: 5px; border: 1px solid #444; background: #222; color: #fff;">
                <button onclick="deletePostByName()" style="background: #ff4757; color: white; width: 100%; padding: 10px; border-radius: 5px; border: none; cursor: pointer;">حذف المنشور</button>
            </div>
        `;
    }
}

async function deletePostByName() {
    const postName = document.getElementById('delete-post-name').value;
    if(!postName) {
        alert("يرجى كتابة اسم المنشور أولاً");
        return;
    }

    const response = await fetch('/api/delete', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ name: postName })
    });

    const result = await response.json();
    if(result.success) {
        alert("تم حذف المنشور بنجاح ✅");
        renderFeed();
        document.getElementById('delete-post-name').value = '';
    } else {
        alert("لم يتم العثور على منشور بهذا الاسم ❌");
    }
}

async function addHeart(postId) {
    const response = await fetch('/api/like', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ postId })
    });
    const result = await response.json();
    document.getElementById(`like-${postId}`).innerText = result.hearts;
}

function logout() {
    localStorage.removeItem('userLoggedIn');
    localStorage.removeItem('userName');
    localStorage.removeItem('userPhone');
    location.reload();
}

window.onload = checkLogin;