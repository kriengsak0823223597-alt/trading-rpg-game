// --- การจัดการสถานะ (Global State) ---
let user = {
    balance: 1000.00, // สมมติเงินทุนเริ่มต้น 1000 USD
    level: 1,
    exp: 0,
    history: []
};

// ค่าคงที่
const EXP_PER_LEVEL_BASE = 1000;
const EXP_PER_DOLLAR_PROFIT = 1; // ทุก $1 กำไร ได้ 1 EXP
const EXP_PER_DOLLAR_WITHDRAW = 1; // ทุก $1 ถอน ลด 1 EXP

// --- ฟังก์ชันช่วยเหลือ ---

/**
 * คำนวณ EXP ที่ต้องใช้ในการเลเวลถัดไป
 * @param {number} level ปัจจุบัน
 * @returns {number} EXP ที่ต้องการ
 */
function getExpToNextLevel(level) {
    // สูตรง่ายๆ: Level N ต้องการ N * EXP_PER_LEVEL_BASE
    return level * EXP_PER_LEVEL_BASE;
}

/**
 * อัปเดตการแสดงผลบนหน้าจอ
 */
function renderStats() {
    const expNeeded = getExpToNextLevel(user.level);

    document.getElementById('currentBalance').textContent = `$${user.balance.toFixed(2)}`;
    document.getElementById('currentLevel').textContent = user.level;
    document.getElementById('currentExp').textContent = user.exp;
    document.getElementById('expToNextLevel').textContent = expNeeded;

    // คำนวณและแสดงผล Progress Bar
    let progressPercent = (user.exp / expNeeded) * 100;
    if (progressPercent > 100) progressPercent = 100; // ป้องกันเกิน 100% ขณะรออัปเดตเลเวล

    document.getElementById('expProgressBar').style.width = `${progressPercent}%`;

    renderHistory();
}

/**
 * ตรวจสอบและจัดการการเลเวลอัพ
 */
function checkLevelUp() {
    let expNeeded = getExpToNextLevel(user.level);
    
    while (user.exp >= expNeeded) {
        user.exp -= expNeeded; // ลบ EXP ที่ใช้ในการเลเวลอัพ
        user.level++;         // เพิ่มเลเวล
        
        console.log(`🎉 เลเวลอัพ! คุณถึง Level ${user.level} แล้ว!`);
        
        // คำนวณ EXP ที่ต้องใช้สำหรับเลเวลใหม่
        expNeeded = getExpToNextLevel(user.level); 
    }
}

/**
 * บันทึกสถานะผู้ใช้ลงใน Local Storage
 */
function saveState() {
    localStorage.setItem('tradingRpgUser', JSON.stringify(user));
}

/**
 * โหลดสถานะผู้ใช้จาก Local Storage หรือใช้ค่าเริ่มต้น
 */
function loadState() {
    const savedState = localStorage.getItem('tradingRpgUser');
    if (savedState) {
        user = JSON.parse(savedState);
    }
    renderStats();
}

// --- ฟังก์ชันหลัก: การเทรดและการถอนเงิน ---

/**
 * จัดการการบันทึกออเดอร์
 * @param {Event} e 
 */
function handleTradeEntry(e) {
    e.preventDefault();

    const pnl = parseFloat(document.getElementById('pnlInput').value);
    const symbol = document.getElementById('symbolInput').value;
    const type = document.getElementById('typeInput').value;
    const date = new Date().toLocaleDateString();

    if (isNaN(pnl)) return alert("โปรดใส่จำนวนกำไร/ขาดทุนที่ถูกต้อง");

    // 1. คำนวณ EXP ที่ได้รับ (จากกำไรเท่านั้น)
    let gainedExp = 0;
    if (pnl > 0) {
        gainedExp = Math.floor(pnl * EXP_PER_DOLLAR_PROFIT);
        user.exp += gainedExp;
    }
    
    // 2. อัปเดตเงินทุน
    user.balance += pnl;

    // 3. บันทึกประวัติ
    user.history.unshift({
        date,
        symbol,
        type,
        pnl,
        exp: gainedExp
    });
    
    // 4. ตรวจสอบการเลเวลอัพ
    checkLevelUp();

    // 5. อัปเดตและบันทึก
    renderStats();
    saveState();
    
    // 6. ล้างฟอร์ม
    e.target.reset();
}

/**
 * จัดการการถอนเงิน (ลด EXP/เลเวล)
 * @param {Event} e 
 */
function handleWithdrawal(e) {
    e.preventDefault();

    const withdrawAmount = parseFloat(document.getElementById('withdrawAmount').value);

    if (isNaN(withdrawAmount) || withdrawAmount <= 0) return alert("โปรดใส่จำนวนเงินที่ถอนที่ถูกต้อง");
    if (withdrawAmount > user.balance) return alert("ยอดเงินในพอร์ตไม่เพียงพอสำหรับการถอน");
    
    // 1. อัปเดตเงินทุน
    user.balance -= withdrawAmount;

    // 2. คำนวณ EXP ที่ลดลง
    const lostExp = Math.floor(withdrawAmount * EXP_PER_DOLLAR_WITHDRAW);
    user.exp -= lostExp;
    
    // 3. ตรวจสอบ EXP ติดลบและลดเลเวล
    while (user.exp < 0 && user.level > 1) {
        user.level--;
        // ดึง EXP ที่ต้องการสำหรับเลเวลที่ลดลงแล้วมาเติม
        const expNeededForLowerLevel = getExpToNextLevel(user.level);
        user.exp += expNeededForLowerLevel; 
    }

    // ป้องกัน EXP/Level ติดลบเมื่อถึง Level 1
    if (user.level === 1 && user.exp < 0) {
        user.exp = 0;
    }
    
    console.log(`💸 ถอนเงิน ${withdrawAmount}! EXP ลดลง ${lostExp} หน่วย.`);

    // 4. อัปเดตและบันทึก
    renderStats();
    saveState();
    
    // 5. ล้างฟอร์ม
    e.target.reset();
}

/**
 * สร้างตารางประวัติการเทรด
 */
function renderHistory() {
    const historyBody = document.getElementById('historyBody');
    historyBody.innerHTML = ''; // ล้างข้อมูลเก่า

    user.history.forEach(trade => {
        const row = historyBody.insertRow();
        
        row.insertCell(0).textContent = trade.date;
        row.insertCell(1).textContent = trade.symbol;
        row.insertCell(2).textContent = trade.type;
        
        const pnlCell = row.insertCell(3);
        pnlCell.textContent = `$${trade.pnl.toFixed(2)}`;
        pnlCell.className = trade.pnl >= 0 ? 'profit' : 'loss';
        
        row.insertCell(4).textContent = trade.exp;
    });
}

// --- การเริ่มต้น (Initialization) ---
document.addEventListener('DOMContentLoaded', () => {
    loadState(); // โหลดข้อมูลผู้ใช้
    
    // ผูก Event Listener กับฟอร์ม
    document.getElementById('tradeForm').addEventListener('submit', handleTradeEntry);
    document.getElementById('withdrawalForm').addEventListener('submit', handleWithdrawal);
});
