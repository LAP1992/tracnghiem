let fullQuestionsData = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = {}; 
let settings = {
    shuffleQ: false,
    shuffleA: false,
    showInstant: true,
    timeLimit: 0, 
    qLimit: 0
};
let timerInterval;
let isQuizFinished = false;
const CHUNK_SIZE = 50; // Mỗi phần 50 câu

// 1. Tải dữ liệu
fetch('de1.json')
    .then(response => response.json())
    .then(data => {
        fullQuestionsData = data;
        initPartSelector(); // [MỚI] Tạo danh sách phần học
    })
    .catch(error => {
        document.getElementById('question-text').innerText = "Lỗi tải dữ liệu. Vui lòng tải lại trang.";
        console.error('Lỗi:', error);
    });

// [MỚI] Hàm tạo danh sách các phần (VD: 1-50, 51-100...)
function initPartSelector() {
    const select = document.getElementById('select-part');
    const total = fullQuestionsData.length;
    
    // Reset và thêm lựa chọn 'Tất cả'
    select.innerHTML = '<option value="all">Tất cả (' + total + ' câu)</option>';

    let partCount = Math.ceil(total / CHUNK_SIZE);
    
    for (let i = 0; i < partCount; i++) {
        let start = i * CHUNK_SIZE + 1;
        let end = Math.min((i + 1) * CHUNK_SIZE, total);
        
        let option = document.createElement('option');
        option.value = i; // Giá trị là số thứ tự phần (0, 1, 2...)
        option.text = `Phần ${i + 1} (Câu ${start} - ${end})`;
        select.appendChild(option);
    }
}

// 2. Logic Mobile Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

// 3. Logic Toggle Input
function toggleInput(checkboxId, inputId) {
    const isChecked = document.getElementById(checkboxId).checked;
    const input = document.getElementById(inputId);
    input.disabled = !isChecked;
    if(isChecked) input.focus();
}

// 4. Bắt đầu bài thi (Đã thêm logic chọn phần)
function startQuiz(applySettings) {
    document.getElementById('setup-modal').style.display = 'none';
    
    userAnswers = {};
    isQuizFinished = false;
    currentQuestionIndex = 0;
    
    // --- LOGIC MỚI: LỌC CÂU HỎI THEO PHẦN ---
    if (applySettings) {
        const partIndex = document.getElementById('select-part').value;
        
        if (partIndex === "all") {
            currentQuestions = [...fullQuestionsData];
        } else {
            // Cắt lấy 50 câu tương ứng
            const pIdx = parseInt(partIndex);
            const start = pIdx * CHUNK_SIZE;
            const end = Math.min((pIdx + 1) * CHUNK_SIZE, fullQuestionsData.length);
            currentQuestions = fullQuestionsData.slice(start, end);
        }

        // Các cài đặt khác
        settings.shuffleQ = document.getElementById('toggle-shuffle-q').checked;
        settings.shuffleA = document.getElementById('toggle-shuffle-a').checked;
        settings.showInstant = document.getElementById('toggle-show-result').checked;
        
        if (document.getElementById('toggle-time-limit').checked) {
            settings.timeLimit = parseInt(document.getElementById('input-time-limit').value) || 0;
        } else {
            settings.timeLimit = 0;
        }

        if (document.getElementById('toggle-question-limit').checked) {
            let limit = parseInt(document.getElementById('input-question-limit').value) || 0;
            // Nếu có giới hạn số câu, cắt tiếp từ danh sách hiện tại
            if (limit > 0 && limit < currentQuestions.length) {
                // Nếu đảo câu hỏi thì đảo trước rồi mới cắt giới hạn
                if (settings.shuffleQ) shuffleArray(currentQuestions);
                currentQuestions = currentQuestions.slice(0, limit);
                // Đã đảo rồi thì tắt cờ shuffle để không đảo lại lần nữa bên dưới
                settings.shuffleQ = false; 
            }
        } else {
            settings.qLimit = 0;
        }

        // Đảo câu hỏi (nếu chưa đảo ở bước limit trên)
        if (settings.shuffleQ) shuffleArray(currentQuestions);
        
    } else {
        // Mặc định (Bỏ qua cài đặt) -> Lấy tất cả
        currentQuestions = [...fullQuestionsData];
        settings.timeLimit = 0;
        settings.shuffleQ = false;
        settings.shuffleA = false;
        settings.showInstant = true; 
    }

    renderSidebar();
    loadQuestion(0);
    startTimer();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 5. Vẽ Sidebar
function renderSidebar() {
    const list = document.getElementById('question-list');
    list.innerHTML = '';
    currentQuestions.forEach((q, index) => {
        const btn = document.createElement('button');
        // Vẫn để số thứ tự là 1, 2, 3... cho dễ theo dõi trong bài thi
        btn.innerText = index + 1; 
        btn.className = 'q-btn';
        btn.id = `q-btn-${index}`;
        btn.onclick = () => {
            loadQuestion(index);
            if (window.innerWidth <= 768) toggleSidebar();
        };
        list.appendChild(btn);
    });
}

// 6. Hiển thị câu hỏi
function loadQuestion(index) {
    if (index < 0 || index >= currentQuestions.length) return;
    currentQuestionIndex = index;

    const question = currentQuestions[index];
    
    // Hiển thị tiêu đề: Câu X (ID gốc nếu cần)
    document.getElementById('question-text').innerText = `Câu ${index + 1}: ${question.question}`;
    
    const answersContainer = document.getElementById('answers-container');
    answersContainer.innerHTML = '';

    let options = [];
    ['A', 'B', 'C', 'D'].forEach(key => {
        if (question[key]) options.push({ key: key, text: question[key] });
    });

    let displayOptions = [...options];
    if (settings.shuffleA) shuffleArray(displayOptions);

    displayOptions.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'answer-option';
        div.innerText = opt.text; 
        div.dataset.key = opt.key;
        
        if (!isQuizFinished) {
            div.onclick = () => checkAnswer(index, opt.key, div);
        } else {
             div.onclick = null;
        }

        const userAnswerKey = userAnswers[index];
        if (userAnswerKey) {
            if (settings.showInstant || isQuizFinished) {
                if (opt.key === question.correct) {
                    div.classList.add('correct');
                } else if (opt.key === userAnswerKey) {
                    div.classList.add('wrong');
                }
            } else {
                if (opt.key === userAnswerKey) div.classList.add('selected-neutral');
            }
        } else if (isQuizFinished && opt.key === question.correct) {
             div.classList.add('correct'); 
             div.style.opacity = "0.7"; 
        }
        
        answersContainer.appendChild(div);
    });

    document.querySelectorAll('.q-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`q-btn-${index}`)?.classList.add('active');
    
    const sidebarBtn = document.getElementById(`q-btn-${index}`);
    if(sidebarBtn) sidebarBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    const btnNext = document.getElementById('btn-next');
    if (index === currentQuestions.length - 1 && !isQuizFinished) {
        btnNext.innerHTML = '<i class="fa-solid fa-check"></i> Nộp bài';
        btnNext.classList.add('finish-mode');
    } else {
        btnNext.innerHTML = 'Sau <i class="fa-solid fa-chevron-right"></i>';
        btnNext.classList.remove('finish-mode');
    }
}

// 7. Chọn đáp án
function checkAnswer(questionIndex, selectedKey, element) {
    if (isQuizFinished) return; 

    const question = currentQuestions[questionIndex];
    if (userAnswers[questionIndex]) return; 

    userAnswers[questionIndex] = selectedKey;
    document.getElementById(`q-btn-${questionIndex}`).classList.add('answered');

    const allOptions = document.querySelectorAll('.answer-option');
    
    if (settings.showInstant) {
        if (selectedKey === question.correct) {
            element.classList.add('correct');
        } else {
            element.classList.add('wrong');
            allOptions.forEach(opt => {
                if (opt.dataset.key === question.correct) opt.classList.add('correct');
            });
        }
    } else {
        element.classList.add('selected-neutral');
    }
}

// 8. Chuyển câu
function handleNextButton() {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        loadQuestion(currentQuestionIndex + 1);
    } else {
        finishQuizConfirmation();
    }
}

function changeQuestion(step) {
    loadQuestion(currentQuestionIndex + step);
}

// 9. Xác nhận nộp
function finishQuizConfirmation() {
    if (isQuizFinished) return;
    
    let answeredCount = Object.keys(userAnswers).length;
    let total = currentQuestions.length;
    
    if (answeredCount < total) {
        if(!confirm(`Bạn mới làm ${answeredCount}/${total} câu. Chắc chắn muốn nộp bài?`)) return;
    } else {
        if(!confirm("Xác nhận nộp bài?")) return;
    }
    finishQuiz();
}

// 10. Tính điểm
function finishQuiz() {
    isQuizFinished = true;
    clearInterval(timerInterval);

    let correctCount = 0;
    currentQuestions.forEach((q, index) => {
        if (userAnswers[index] === q.correct) correctCount++;
        const btn = document.getElementById(`q-btn-${index}`);
        if (userAnswers[index] && userAnswers[index] !== q.correct) {
            btn.classList.add('wrong-mark');
        }
    });

    const total = currentQuestions.length;
    const percent = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    
    document.getElementById('score-text').innerText = `${correctCount}/${total}`;
    document.getElementById('result-percent').innerText = `${percent}%`;
    document.getElementById('result-time').innerText = document.getElementById('timer').innerText;
    
    const msgElement = document.getElementById('result-message');
    const scoreValElement = document.getElementById('score-text');
    
    if (percent >= 90) {
        msgElement.innerText = "Xuất sắc! 🏆";
        msgElement.style.color = "#27ae60";
        scoreValElement.style.color = "#27ae60";
    } else if (percent >= 70) {
        msgElement.innerText = "Làm tốt lắm! 🎉";
        msgElement.style.color = "#2980b9";
        scoreValElement.style.color = "#2980b9";
    } else if (percent >= 50) {
        msgElement.innerText = "Tạm được! 👌";
        msgElement.style.color = "#f39c12";
        scoreValElement.style.color = "#f39c12";
    } else {
        msgElement.innerText = "Cố gắng lần sau nhé! 💪";
        msgElement.style.color = "#e74c3c";
        scoreValElement.style.color = "#e74c3c";
    }

    document.getElementById('result-modal').style.display = 'flex';
    loadQuestion(currentQuestionIndex);
}

function reviewQuiz() {
    document.getElementById('result-modal').style.display = 'none';
}

function returnToSetup() {
    document.getElementById('result-modal').style.display = 'none';
    document.getElementById('setup-modal').style.display = 'flex';
    clearInterval(timerInterval);
    document.getElementById('timer').innerText = "00:00";
    const btnNext = document.getElementById('btn-next');
    btnNext.innerHTML = 'Sau <i class="fa-solid fa-chevron-right"></i>';
    btnNext.classList.remove('finish-mode');
}

// 11. Timer
function startTimer() {
    let seconds = 0;
    let limitSeconds = settings.timeLimit * 60;
    const timerEl = document.getElementById('timer');
    clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        if (settings.timeLimit > 0) {
            limitSeconds--;
            let m = Math.floor(limitSeconds / 60).toString().padStart(2, '0');
            let s = (limitSeconds % 60).toString().padStart(2, '0');
            timerEl.innerText = `${m}:${s}`;
            if (limitSeconds <= 0) {
                clearInterval(timerInterval);
                alert("Hết giờ làm bài!");
                finishQuiz();
            }
        } else {
            seconds++;
            let m = Math.floor(seconds / 60).toString().padStart(2, '0');
            let s = (seconds % 60).toString().padStart(2, '0');
            timerEl.innerText = `${m}:${s}`;
        }
    }, 1000);
}
