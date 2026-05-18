import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

html_path = r'c:\Users\HP\Desktop\SmartPM\frontend\src\app\components\member-dashboard\member-dashboard.html'

with open(html_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1) Add timer to quiz modal header (LF line endings, 4-space indent)
old1 = '    <div class="modal-header">\n     <h3>\U0001f4dd Certification : {{ activeQuiz.trainingId.title }}</h3>\n     <button class="btn-abs-close" (click)="closeQuiz()">&times;</button>\n    </div>'
new1 = '    <div class="modal-header" style="align-items:flex-start;">\n     <h3>\U0001f4dd Certification : {{ activeQuiz.trainingId.title }}</h3>\n     <div style="display:flex;align-items:center;gap:12px;">\n      <div *ngIf="!quizResult" class="quiz-timer-badge" [class.urgent]="quizTimerUrgent">\u23f1\ufe0f {{ formatQuizTimer(quizTimeLeft) }}</div>\n      <button class="btn-abs-close" (click)="closeQuiz()">&times;</button>\n     </div>\n    </div>'

if old1 in content:
    content = content.replace(old1, new1, 1)
    print('OK: timer added to quiz modal header')
else:
    print('FAIL1: header not matched')

# 2) Add certificate button in quiz result (after passingScore line)
old2 = '     <p class="text-muted">Score minimum requis : {{ activeQuiz.trainingId.passingScore }}%</p>\n     </div>\n    </div>'
new2 = '     <p class="text-muted">Score minimum requis : {{ activeQuiz.trainingId.passingScore }}%</p>\n     <div class="mt-3" style="margin-top:18px;">\n      <button class="btn-cert" *ngIf="quizResult.passed" (click)="downloadCertificate(activeQuiz)">\U0001f4c4 T\xe9l\xe9charger mon Certificat</button>\n     </div>\n     </div>\n    </div>'

if old2 in content:
    content = content.replace(old2, new2, 1)
    print('OK: certificate button added')
else:
    print('FAIL2: result section not matched')
    idx = content.find('passingScore')
    print('Context:', repr(content[idx-100:idx+150]))

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(content)

print('File saved.')
