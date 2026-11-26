from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path('output/diagrams')
OUT.mkdir(parents=True, exist_ok=True)
S = 2
BG = '#F4F7FB'
INK = '#172B45'
MUTED = '#52677F'
LINE = '#60758C'
WHITE = '#FFFFFF'
BLUE = '#2D6CDF'
TEAL = '#11998E'
PURPLE = '#7457C8'
ORANGE = '#CF7A21'
PALE_BLUE = '#E9F0FF'
PALE_TEAL = '#E5F5F3'
PALE_PURPLE = '#F0ECFA'
PALE_ORANGE = '#FFF2E2'
BORDER = '#CBD5E1'
FONT_REG = r'C:\Windows\Fonts\arial.ttf'
FONT_BOLD = r'C:\Windows\Fonts\arialbd.ttf'

def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size * S)

def sc(p):
    return tuple(int(v * S) for v in p)

def canvas(width, height, title, subtitle):
    im = Image.new('RGB', (width*S, height*S), BG)
    d = ImageDraw.Draw(im)
    d.text(sc((50, 28)), title, font=font(28, True), fill=INK)
    d.text(sc((50, 70)), subtitle, font=font(13), fill=MUTED)
    d.line([sc((50, 112)), sc((width-50, 112))], fill=BORDER, width=2*S)
    return im, d

def text_width(d, text, f):
    return d.textbbox((0,0), text, font=f)[2]

def wrap(d, text, f, maxw):
    words=text.split()
    lines=[]; line=''
    for word in words:
        trial=(line+' '+word).strip()
        if line and text_width(d,trial,f) > maxw*S:
            lines.append(line); line=word
        else: line=trial
    if line: lines.append(line)
    return lines

def multiline(d, xy, text, f, fill, maxw, leading=5, align='left'):
    x,y=xy
    lines=[]
    for para in text.split('\n'):
        lines.extend(wrap(d,para,f,maxw) if para else [''])
    line_h=f.getbbox('Ag')[3]-f.getbbox('Ag')[1]
    for line in lines:
        w=text_width(d,line,f)
        tx=x if align=='left' else x-w/2 if align=='center' else x-w
        d.text((int(tx),int(y)),line,font=f,fill=fill)
        y += line_h + leading*S
    return y

def round_box(d, x,y,w,h, fill=WHITE, outline=BORDER, radius=14, width=1):
    d.rounded_rectangle([x*S,y*S,(x+w)*S,(y+h)*S],radius=radius*S,fill=fill,outline=outline,width=width*S)

def section(d, x,y,w,h,title,color):
    round_box(d,x,y,w,h,WHITE,BORDER,18,1)
    d.rounded_rectangle([x*S,y*S,(x+w)*S,(y+54)*S],radius=18*S,fill=color)
    d.rectangle([x*S,(y+35)*S,(x+w)*S,(y+54)*S],fill=color)
    d.text(sc((x+18,y+15)),title,font=font(17,True),fill=WHITE)

def card(d,x,y,w,h,title,body,accent=BLUE,body_size=13, fill=WHITE):
    round_box(d,x,y,w,h,fill,BORDER,13,1)
    d.rounded_rectangle([x*S,y*S,(x+7)*S,(y+h)*S],radius=7*S,fill=accent)
    d.text(sc((x+18,y+13)),title,font=font(15,True),fill=INK)
    multiline(d,sc((x+18,y+42)),body,font(body_size),MUTED,w-34,leading=3)

def arrow(d, points, color=LINE, width=2, label=None, label_xy=None):
    pts=[sc(p) for p in points]
    d.line(pts,fill=color,width=width*S,joint='curve')
    (x1,y1),(x2,y2)=pts[-2],pts[-1]
    import math
    ang=math.atan2(y2-y1,x2-x1); length=9*S; spread=0.55
    a=(int(x2-length*math.cos(ang-spread)),int(y2-length*math.sin(ang-spread)))
    b=(int(x2-length*math.cos(ang+spread)),int(y2-length*math.sin(ang+spread)))
    d.polygon([pts[-1],a,b],fill=color)
    if label and label_xy:
        f=font(10,True); tw=text_width(d,label,f)/S
        lx,ly=label_xy
        round_box(d,lx-tw/2-8,ly-3,tw+16,22,WHITE,BORDER,8,1)
        d.text(sc((lx,ly)),label,font=f,fill=color,anchor='mt')

def architecture():
    W,H=1800,1160
    im,d=canvas(W,H,'SecureCode AI | Low-level component architecture',
        'Concrete modules and request paths in the current Express, React, analyzer, GitHub, Gemini, and Neon implementation')
    # lane backplates
    section(d,45,145,350,930,'WEB CLIENT',BLUE)
    section(d,425,145,440,930,'EXPRESS APPLICATION',TEAL)
    section(d,895,145,445,930,'REVIEW PIPELINE',PURPLE)
    section(d,1370,145,385,930,'INTEGRATIONS / DATA',ORANGE)
    # client
    card(d,65,220,310,170,'React application',
        'dashboard/client/src/App.jsx\nRoute shell and account state',BLUE)
    card(d,65,415,310,255,'Review screens',
        'QuickReview.jsx — paste/upload, progress, findings\nDashboard.jsx — owned review history\nPRDetail.jsx — findings and diff view',BLUE)
    card(d,65,695,310,190,'HTTP client',
        'api.js → http.js\nAxios, same-origin /api calls\nCSRF token header + session cookies',BLUE)
    card(d,65,915,310,110,'Live updates',
        'useLiveEvents.js → GET /api/events (SSE)',BLUE)
    # express
    card(d,445,220,400,165,'Process entry',
        'server.js starts Express; start:render applies SQL migrations\napp.js mounts routers and static dashboard',TEAL)
    card(d,445,410,400,215,'Shared middleware',
        'request ID, HTTPS, security headers\nCORS / no-store / body limits\nCSRF + global API limits\nZod validation + centralized errors',TEAL)
    card(d,445,665,400,190,'Dashboard API routes',
        'auth.js · github.js · repo-view.js\npr-drilldown.js · analytics.js · events.js\nquick-review.js: optional GitHub auth\nPR publishing still requires GitHub auth',TEAL)
    card(d,445,895,400,155,'Webhook endpoint',
        'POST /webhook/github\nRaw body retained for HMAC signature verification',TEAL)
    # pipeline
    card(d,915,220,405,215,'Quick Check orchestrator',
        'dashboard/api/quick-review.js\nnormalizeFiles → chunkFiles → buildSyntheticDiff\nStatic + Gemini per batch; guest result is temporary',PURPLE)
    card(d,915,470,405,190,'PR webhook worker',
        'trigger/webhook-handler.js\nverifySignature → deduplicate → bounded queue\ngetTokenForRepo → fetchDiff',PURPLE)
    card(d,915,695,405,155,'Static analyzer',
        'review-engine/static-analyzer.js\nsplit diff by file → temp source files → Semgrep CLI',PURPLE)
    card(d,915,885,405,155,'AI + finding pipeline',
        'llm-analyzer.js → Gemini generateContent\nmerge-findings.js → findings/validate.js',PURPLE)
    # external/data
    card(d,1390,220,345,170,'GitHub App / REST API',
        'Webhook deliveries; PR diff retrieval; review comments; OAuth identity',ORANGE)
    card(d,1390,420,345,140,'Semgrep CLI',
        'Local subprocess; scans added lines from temporary files',ORANGE)
    card(d,1390,590,345,140,'Gemini API',
        'Configured model receives diff + static findings; returns JSON findings',ORANGE)
    card(d,1390,765,345,260,'Neon PostgreSQL',
        'findings/db.js transaction:\nreviews + findings\ngithub_users + user_sessions\nadmin_users + admin_sessions\nrecovery codes + audit log',ORANGE)
    # main edges
    arrow(d,[(375,790),(445,790)],BLUE,label='HTTPS /api',label_xy=(410,760))
    arrow(d,[(645,385),(645,410)],TEAL)
    arrow(d,[(645,625),(645,665)],TEAL)
    arrow(d,[(645,855),(645,895)],TEAL)
    arrow(d,[(845,735),(880,735),(880,325),(915,325)],TEAL,label='POST /quick-review',label_xy=(880,475))
    arrow(d,[(845,970),(880,970),(880,565),(915,565)],TEAL,label='signed webhook',label_xy=(880,825))
    arrow(d,[(1118,435),(1118,470)],PURPLE,label='Quick Check diff',label_xy=(1195,453))
    arrow(d,[(1118,660),(1118,695)],PURPLE,label='PR diff',label_xy=(1170,678))
    arrow(d,[(1118,850),(1118,885)],PURPLE)
    arrow(d,[(1320,755),(1350,755),(1350,490),(1390,490)],ORANGE,label='execFile()',label_xy=(1350,635))
    arrow(d,[(1320,945),(1350,945),(1350,660),(1390,660)],ORANGE,label='generateContent()',label_xy=(1350,820))
    arrow(d,[(1320,1010),(1355,1010),(1355,880),(1390,880)],ORANGE,label='transaction',label_xy=(1353,985))
    arrow(d,[(1390,305),(1360,305),(1360,565),(1320,565)],ORANGE,label='fetch diff / post comment',label_xy=(1360,388))
    # notes
    d.text(sc((50,1092)),'Quick Check API can run without GitHub sign-in; saving to private history and creating a PR require an account.',font=font(12,True),fill=MUTED)
    im.save(OUT/'securecode-ai-low-level-architecture.png',optimize=True)

def entity(d,x,y,w,title,fields,accent=BLUE, row_h=31, header_h=45):
    h=header_h+len(fields)*row_h
    round_box(d,x,y,w,h,WHITE,BORDER,12,1)
    d.rounded_rectangle([x*S,y*S,(x+w)*S,(y+header_h)*S],radius=12*S,fill=accent)
    d.rectangle([x*S,(y+header_h-12)*S,(x+w)*S,(y+header_h)*S],fill=accent)
    d.text(sc((x+15,y+12)),title,font=font(15,True),fill=WHITE)
    for i,(field,kind) in enumerate(fields):
        yy=y+header_h+i*row_h
        if i%2==0: d.rectangle([x*S,yy*S,(x+w)*S,(yy+row_h)*S],fill='#F7F9FC')
        d.text(sc((x+14,yy+7)),field,font=font(11,kind in ('PK','FK')),fill=INK)
        if kind:
            color={'PK':BLUE,'FK':TEAL,'UQ':PURPLE,'NO FK':ORANGE}.get(kind,MUTED)
            f=font(9,True); tw=text_width(d,kind,f)/S
            round_box(d,x+w-tw-30,yy+5,tw+15,20,'#EEF3F8',BORDER,7,1)
            d.text(sc((x+w-22,yy+7)),kind,font=f,fill=color,anchor='ra')
        if i<len(fields)-1: d.line([sc((x+12,yy+row_h)),sc((x+w-12,yy+row_h))],fill='#E3E9F0',width=1*S)
    return h

def relation(d,points,label,label_xy,color=LINE):
    arrow(d,points,color,2,label,label_xy)

def er_diagram():
    W,H=1880,1590
    im,d=canvas(W,H,'SecureCode AI | Database ER diagram',
        'Neon PostgreSQL schema after migrations 001–007; nullable fields and delete behavior shown where relevant')
    # Core review tables
    entity(d,55,170,500,'github_users',[
        ('id  SERIAL','PK'),('github_id  BIGINT','UQ'),('login  VARCHAR',''),('name, avatar_url',''),
        ('access_token_enc  TEXT',''),('created_at, updated_at',''),('row_version  INTEGER','')],BLUE,31)
    entity(d,665,170,560,'reviews',[
        ('id  SERIAL','PK'),('source_type  VARCHAR',''),('repo_owner, repo_name',''),('pr_number, file_name',''),
        ('overall_score  INTEGER',''),('diff_text  TEXT',''),('source_code  TEXT',''),('source_files  JSONB',''),
        ('owner_user_id  INTEGER  NULL','FK'),('created_at  TIMESTAMP',''),('row_version  INTEGER','')],PURPLE,30)
    entity(d,1335,170,485,'findings',[
        ('id  SERIAL','PK'),('review_id  INTEGER','FK'),('file_path  VARCHAR',''),('severity  VARCHAR',''),
        ('category  VARCHAR',''),('issue, suggestion  TEXT',''),('created_at  TIMESTAMP',''),('row_version  INTEGER','')],TEAL,31)
    entity(d,55,570,500,'user_sessions',[
        ('id  SERIAL','PK'),('session_hash  CHAR(64)','UQ'),('user_id  INTEGER','FK'),('created_at  TIMESTAMP',''),('expires_at  TIMESTAMP','')],BLUE,32)
    # Admin tables
    entity(d,55,930,560,'admin_users',[
        ('id  SERIAL','PK'),('username  VARCHAR','UQ'),('email  VARCHAR','UQ'),('password_hash  TEXT',''),
        ('role, is_active, must_change_password',''),('totp_secret_enc, totp_enabled',''),
        ('failed_attempts, locked_until',''),('created_by  INTEGER  NULL','FK'),('created_at, updated_at','')],ORANGE,31)
    entity(d,700,900,500,'admin_sessions',[
        ('id  SERIAL','PK'),('token_hash  CHAR(64)','UQ'),('admin_id  INTEGER','FK'),('stage, mfa_attempts',''),
        ('ip, user_agent',''),('created_at, last_seen_at',''),('expires_at  TIMESTAMPTZ','')],ORANGE,31)
    entity(d,700,1230,500,'admin_recovery_codes',[
        ('id  SERIAL','PK'),('admin_id  INTEGER','FK'),('code_hash  CHAR(64)',''),('used_at  TIMESTAMPTZ',''),('created_at  TIMESTAMPTZ','')],ORANGE,30)
    entity(d,1335,800,485,'admin_audit_log',[
        ('id  BIGSERIAL','PK'),('admin_id  INTEGER  NULL','NO FK'),('admin_username  VARCHAR',''),
        ('action, target, ip',''),('details  JSONB',''),('created_at  TIMESTAMPTZ','')],ORANGE,31)
    entity(d,1335,1135,485,'schema_migrations',[
        ('version  VARCHAR(10)','PK'),('name  TEXT',''),('checksum  CHAR(64)',''),('applied_at  TIMESTAMPTZ','')],MUTED,33)
    # Relationships and cardinalities
    relation(d,[(555,330),(665,330)],'1 : 0..N',(610,295),BLUE) # users -> reviews
    relation(d,[(1225,350),(1335,350)],'1 : 0..N',(1280,315),PURPLE) # reviews -> findings
    relation(d,[(305,387),(305,570)],'1 : 0..N',(370,490),BLUE) # users -> sessions
    relation(d,[(615,1080),(655,1080),(655,1010),(700,1010)],'1 : 0..N',(655,1042),ORANGE)
    relation(d,[(615,1140),(655,1140),(655,1320),(700,1320)],'1 : 0..N',(655,1205),ORANGE)
    # Admin self-reference: created_by -> admin_users.id
    relation(d,[(615,960),(645,930),(520,900),(520,930)],'created_by',(584,914),ORANGE)
    # Audit relationship deliberately has no FK; show annotation only.
    round_box(d,1335,1460,485,76,PALE_ORANGE,'#E7C49A',9,1)
    multiline(d,sc((1350,1474)),'admin_audit_log intentionally has no foreign key; migration history is operational metadata.',font(10),MUTED,455,leading=2)
    # Footer legend
    y=1534
    d.text(sc((55,y)),'Key:',font=font(10,True),fill=INK)
    for x,label,col in [(105,'PK  primary key',BLUE),(300,'FK  foreign key',TEAL),(500,'UQ  unique',PURPLE),(660,'NO FK  intentional',ORANGE)]:
        round_box(d,x,y-1,118,24,'#EEF3F8',BORDER,7,1)
        d.text(sc((x+8,y+4)),label,font=font(9,True),fill=col)
    d.text(sc((805,y+2)),'Delete rules: review → findings CASCADE; user/admin sessions and recovery codes CASCADE; review owner SET NULL.',font=font(10),fill=MUTED)
    im.save(OUT/'securecode-ai-er-diagram.png',optimize=True)

if __name__=='__main__':
    architecture()
    er_diagram()
    print('Created:')
    for p in sorted(OUT.glob('*.png')): print(p,Image.open(p).size)
