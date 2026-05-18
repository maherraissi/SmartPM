import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

path = r'c:\Users\HP\Desktop\SmartPM\frontend\src\app\components\admin-dashboard\admin-dashboard.html'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Target: the section-block that contains 'Statut Formation par Membre'
# Insert analytics block BEFORE it
idx_title = content.find('Statut Formation par Membre')
section_start = content.rfind('\n', 0, content.rfind('<div class="section-block', 0, idx_title))

insert_pos = section_start  # insert before the \n that precedes <div class="section-block

analytics = '''

   <!-- 📊 ANALYTICS FORMATIONS -->
   <div class="section-block mt-5" *ngIf="trainingAnalytics">
    <div class="section-header-row">
     <h2 class="section-title">📊 Analytics Formations</h2>
     <span class="badge-grey">{{ trainingAnalytics.total }} membres suivis</span>
    </div>
    <div class="analytics-kpi-row">
     <div class="akpi-card green">
      <div class="akpi-val">{{ trainingAnalytics.completionRate }}%</div>
      <div class="akpi-label">Taux de Réussite</div>
      <div class="akpi-bar"><div class="akpi-fill" [style.width.%]="trainingAnalytics.completionRate"></div></div>
     </div>
     <div class="akpi-card blue">
      <div class="akpi-val">{{ trainingAnalytics.avgScore }}%</div>
      <div class="akpi-label">Score Quiz Moyen</div>
      <div class="akpi-bar"><div class="akpi-fill blue-fill" [style.width.%]="trainingAnalytics.avgScore"></div></div>
     </div>
     <div class="akpi-card orange">
      <div class="akpi-val">{{ trainingAnalytics.inProgress }}</div>
      <div class="akpi-label">En Cours</div>
      <div class="akpi-bar"><div class="akpi-fill orange-fill" [style.width.%]="(trainingAnalytics.inProgress / trainingAnalytics.total) * 100"></div></div>
     </div>
     <div class="akpi-card red">
      <div class="akpi-val">{{ trainingAnalytics.failed }}</div>
      <div class="akpi-label">Échoués</div>
      <div class="akpi-bar"><div class="akpi-fill red-fill" [style.width.%]="(trainingAnalytics.failed / trainingAnalytics.total) * 100"></div></div>
     </div>
    </div>
    <div class="formation-chart-card" *ngIf="trainingAnalytics.formations.length > 0">
     <div class="chart-title">Complétion par Formation</div>
     <div class="f-chart-bars">
      <div class="f-chart-row" *ngFor="let f of trainingAnalytics.formations">
       <div class="fcr-label">{{ f.title }}</div>
       <div class="fcr-track">
        <div class="fcr-fill" [style.width.%]="f.total > 0 ? (f.completed / f.total) * 100 : 0"></div>
       </div>
       <div class="fcr-count">{{ f.completed }}/{{ f.total }}</div>
       <div class="fcr-pct">{{ f.total > 0 ? ((f.completed / f.total) * 100).toFixed(0) : 0 }}%</div>
      </div>
     </div>
    </div>
   </div>'''

content = content[:insert_pos] + analytics + content[insert_pos:]
print(f'Inserted analytics block at position {insert_pos}')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('File saved. Length:', len(content))
