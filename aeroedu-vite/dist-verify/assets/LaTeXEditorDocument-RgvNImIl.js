const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/index-BWAzFWTV.js","assets/react-vendor-DgwaEaxy.js"])))=>i.map(i=>d[i]);
import{j as e}from"./query-vendor-G04g7eLE.js";import{r,f as pe,b as ge}from"./react-vendor-DgwaEaxy.js";import{l as me,O as a,L as b}from"./index-DqcUFZJx.js";import{_ as fe}from"./three-vendor-D5zvyadk.js";import{A as xe}from"./arrow-left-35w30Hsc.js";import{S as be}from"./save-BFbLeLZa.js";import{P as D}from"./play-C2OCRpmo.js";import{H as ye}from"./history-hEiUpQYh.js";import{S as je}from"./share-2-DerNza_K.js";import{F as J}from"./file-code-2-Cr_auNxQ.js";import{D as ke}from"./download-DG_7BAJ5.js";import{T as ve}from"./trash-2-Co0aVw_6.js";import"./chart-vendor-BR-91hsK.js";import"./form-vendor-C7Om6Kk-.js";const Ce=me("Printer",[["polyline",{points:"6 9 6 2 18 2 18 9",key:"1306q4"}],["path",{d:"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",key:"143wyd"}],["rect",{width:"12",height:"8",x:"6",y:"14",key:"5ipwut"}]]),Se=r.lazy(()=>fe(()=>import("./index-BWAzFWTV.js"),__vite__mapDeps([0,1])).then(i=>({default:i.Editor})));function Ie({value:i,onChange:c,height:d="100%",readOnly:g}){const s=r.useRef(i);r.useEffect(()=>{s.current=i},[i]);const u=m=>{const j=m??"";s.current=j,c(j)};return e.jsx("div",{style:{height:d,minHeight:300,width:"100%",overflow:"hidden"},children:e.jsx(r.Suspense,{fallback:e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#94a3b8",fontSize:14,background:"#0d0e17"},children:"Đang tải editor..."}),children:e.jsx(Se,{language:"latex",theme:"vs-dark",value:i,onChange:u,height:d,options:{minimap:{enabled:!0},fontSize:14,readOnly:!!g,wordWrap:"on",automaticLayout:!0,scrollBeyondLastLine:!1,lineNumbers:"on",renderWhitespace:"selection",bracketPairColorization:{enabled:!0}},loading:null})})})}const Y=[{id:"article-vi",name:"Article cơ bản (Tiếng Việt)",description:"Tài liệu article với babel vietnamese, amsmath, geometry, siunitx",body:`\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{siunitx}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\title{Tiêu đề tài liệu}
\\author{Giáo viên: (Tên bạn)}
\\date{}

\\begin{document}
\\maketitle

\\section*{Ghi chú}
Nội dung tài liệu của bạn. Công thức inline: $E = mc^2$. Công thức hiển thị:
\\[
  \\int_0^1 f(x)\\,dx = F(1) - F(0).
\\]

\\section{Nội dung}
Viết thêm tại đây.

\\end{document}
`},{id:"exam-mcq",name:"Đề thi trắc nghiệm",description:"Cấu trúc đề thi trắc nghiệm 4 lựa chọn A, B, C, D",body:`\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath}
\\usepackage{geometry}
\\usepackage{enumitem}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}

\\title{ĐỀ THI TRẮC NGHIỆM}
\\author{Môn: --- \\quad Khối: --- \\quad Thời gian: --- phút}
\\date{}

\\begin{document}
\\maketitle
\\noindent\\textbf{Họ và tên:} \\underline{\\hspace{5cm}} \\quad \\textbf{SBD:} \\underline{\\hspace{3cm}}

\\bigskip
\\begin{enumerate}[left=0pt]
  \\item Câu 1. Nội dung câu hỏi?
  \\begin{enumerate}[label=\\Alph*.]
    \\item Đáp án A
    \\item Đáp án B
    \\item Đáp án C
    \\item Đáp án D
  \\end{enumerate}

  \\item Câu 2. Câu hỏi tiếp theo?
  \\begin{enumerate}[label=\\Alph*.]
    \\item Đáp án A
    \\item Đáp án B
    \\item Đáp án C
    \\item Đáp án D
  \\end{enumerate}
\\end{enumerate}

\\end{document}
`},{id:"huong-dan-giai-vat-ly",name:"Hướng dẫn giải đề Vật lý",description:"Cấu trúc hướng dẫn giải đề (Phần I trắc nghiệm, II đúng/sai, III bài toán)",body:`\\documentclass[12pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[vietnamese]{babel}
\\usepackage{amsmath,amssymb}
\\usepackage{geometry}
\\usepackage{enumitem}
\\usepackage{siunitx}
\\geometry{top=2cm,bottom=2cm,left=2cm,right=2cm}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{6pt}

\\title{Hướng dẫn giải -- Đề chính thức Vật lý \\\\ Mã đề --- -- Kỳ thi TN THPT ---\\\\[4pt]
\\small (Phần I, II, III -- lời giải chi tiết)}
\\author{Giáo viên: (Tên bạn)}
\\date{}

\\begin{document}
\\maketitle

\\section*{Ghi chú}
\\begin{itemize}
  \\item Tài liệu trình bày đầy đủ \\textbf{Phần I (trắc nghiệm)}, \\textbf{Phần II (đúng/sai)} và \\textbf{Phần III (bài toán)} với các bước giải.
  \\item Mọi số liệu và đề bài lấy theo đề gốc. Ghi rõ từng bước tính toán và cách làm tròn kết quả theo yêu cầu đề.
\\end{itemize}

\\hrule
\\section*{Đáp án tóm tắt}
\\begin{itemize}
  \\item \\textbf{Phần I:} (điền đáp án từng câu).
  \\item \\textbf{Phần II:} (mỗi câu có 4 phát biểu a,b,c,d; ghi Đ/S và lí giải).
  \\item \\textbf{Phần III:} (kết quả cuối cùng từng câu).
\\end{itemize}

\\hrule
\\section*{Phần I -- Trắc nghiệm}
\\begin{enumerate}[left=0pt]
  \\item (Nội dung và đáp án câu 1)
  \\item (Nội dung và đáp án câu 2)
\\end{enumerate}

\\hrule
\\section*{Phần II -- Trắc nghiệm đúng/sai}
\\subsection*{Câu 1}
(Phát biểu a--d và nhận xét Đ/S.)

\\subsection*{Câu 2}
(Phát biểu và giải thích.)

\\hrule
\\section*{Phần III -- Bài toán tính toán}
\\subsection*{Câu 1}
(Dữ liệu, công thức, thay số, kết quả.)

\\subsection*{Câu 2}
(Lời giải chi tiết.)

\\end{document}
`}];function we(i){return Y.find(c=>c.id===i)}const n={bg:"#0d0e17",card:"#10111e",card2:"#161728",border:"#1e2033",border2:"#2a2b3d",text:"#f1f5f9",muted:"#94a3b8",purple:"#7c3aed"},ze=2500;function y({onClick:i,disabled:c,title:d,children:g,danger:s,active:u}){return e.jsx("button",{onClick:i,disabled:c,title:d,style:{background:s?"rgba(239,68,68,0.12)":u?n.purple:n.card2,border:s?"1px solid rgba(239,68,68,0.3)":`1px solid ${n.border2}`,borderRadius:8,color:s?"#f87171":u?"#fff":n.text,cursor:c?"not-allowed":"pointer",opacity:c?.55:1,padding:"6px 10px",lineHeight:1,display:"inline-flex",alignItems:"center",gap:5,fontSize:13,fontWeight:600},children:g})}function Ve(){const{id:i}=pe(),c=ge(),[d,g]=r.useState(""),[s,u]=r.useState(""),[m,j]=r.useState(!0),[$,B]=r.useState(!1),[Q,W]=r.useState(!1),[l,O]=r.useState(!1),[A,H]=r.useState(null),[p,Z]=r.useState(null),[ee,te]=r.useState(!0),[F,ne]=r.useState([]),[v,w]=r.useState(!1),[z,N]=r.useState(null),[T,P]=r.useState(!1),[V,ie]=r.useState([]),[f,_]=r.useState(""),[M,re]=r.useState("VIEW"),[C,U]=r.useState(!1),[oe,se]=r.useState(""),h=r.useRef(null),k=r.useRef(null),E=r.useRef(!1);r.useEffect(()=>()=>{k.current&&URL.revokeObjectURL(k.current)},[]);const S=r.useCallback(async(t,o)=>{if(i){B(!0);try{if(!(await fetch(`/api/latex-projects/${i}`,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({mainContent:t,...o!==void 0&&{title:o}})})).ok)throw new Error("Save failed");a.success("Đã lưu")}catch{a.error("Không thể lưu")}finally{B(!1)}}},[i]);r.useEffect(()=>{if(!i)return;let t=!1;return j(!0),W(!1),fetch(`/api/latex-projects/${i}`).then(o=>o.ok?o.json():(o.status===404&&W(!0),null)).then(o=>{t||!o||(g(o.title??""),u(o.mainContent??""),te(o.isOwner!==!1))}).finally(()=>{t||j(!1)}),()=>{t=!0}},[i]),r.useEffect(()=>{if(!(!i||m))return h.current&&clearTimeout(h.current),h.current=setTimeout(()=>{h.current=null,S(s)},ze),()=>{h.current&&clearTimeout(h.current)}},[s,i,m,S]);const R=r.useCallback(()=>{i&&fetch(`/api/latex-projects/${i}/versions`).then(t=>t.ok?t.json():null).then(t=>t?.versions&&ne(t.versions)).catch(()=>{})},[i]);r.useEffect(()=>{i&&!m&&R()},[i,m,R]);const I=r.useCallback(()=>{i&&fetch(`/api/latex-projects/${i}/collaborators`).then(t=>t.ok?t.json():null).then(t=>t?.collaborators&&ie(t.collaborators)).catch(()=>{})},[i]);r.useEffect(()=>{T&&i&&I()},[T,i,I]);const ae=()=>{h.current&&(clearTimeout(h.current),h.current=null),S(s)},le=t=>{if(!t)return;const o=we(t);o&&(u(o.body),a.success(`Đã áp dụng mẫu: ${o.name}`)),se("")},L=async()=>{if(!(!i||E.current)){E.current=!0,O(!0),H(null);try{const t=await fetch("/api/latex-projects/compile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({projectId:i,content:s})});if(!t.ok){const K=await t.json().catch(()=>({})),G=K.error??"Biên dịch thất bại";H(K.log??G),t.status===503?a.error("Dịch vụ biên dịch chưa sẵn sàng. Cấu hình Docker TeX Live hoặc thử lại sau."):a.error(G);return}const o=await t.blob();k.current&&URL.revokeObjectURL(k.current);const x=URL.createObjectURL(o);k.current=x,Z(x),a.success("Đã biên dịch. Xem PDF bên phải.")}catch{a.error("Lỗi khi gọi dịch vụ biên dịch")}finally{O(!1),E.current=!1}}},ce=()=>{if(!p)return;const t=document.createElement("a");t.href=p,t.download=`${d||"output"}.pdf`,t.click()},de=()=>{if(!p)return;const t=window.open(p,"_blank");t&&(t.onload=()=>{t.print(),t.close()})},ue=async t=>{if(i){N(t);try{const o=await fetch(`/api/latex-projects/${i}/versions/restore`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({versionId:t})});if(!o.ok)throw new Error("Restore failed");const x=await o.json();u(x.mainContent??""),g(x.title??""),a.success("Đã khôi phục phiên bản"),w(!1),R()}catch{a.error("Không thể khôi phục")}finally{N(null)}}},X=async()=>{if(!(!i||!f.trim())){U(!0);try{const t=await fetch(`/api/latex-projects/${i}/collaborators`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:f.trim(),role:M})});if(!t.ok){const o=await t.json().catch(()=>({}));throw new Error(o.error||"Failed")}_(""),I(),a.success("Đã thêm cộng tác viên")}catch(t){a.error(t instanceof Error?t.message:"Không thể thêm")}finally{U(!1)}}},he=async t=>{if(i)try{if(!(await fetch(`/api/latex-projects/${i}/collaborators/${t}`,{method:"DELETE"})).ok)throw new Error("Failed");I(),a.success("Đã xóa cộng tác viên")}catch{a.error("Không thể xóa")}};if(m)return e.jsx("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:n.bg},children:e.jsx(b,{size:36,style:{color:n.muted,animation:"spin 1s linear infinite"}})});if(!i||Q)return e.jsxs("div",{style:{background:n.bg,minHeight:"100vh",padding:40},children:[e.jsx("p",{style:{color:n.muted,marginBottom:16},children:"Tài liệu không tồn tại."}),e.jsx("button",{onClick:()=>c("/teacher/latex-documents"),style:{background:n.card2,border:`1px solid ${n.border2}`,borderRadius:8,color:n.text,cursor:"pointer",padding:"8px 18px",fontSize:14},children:"Quay lại danh sách"})]});const q={background:n.card2,border:`1px solid ${n.border2}`,borderRadius:8,color:n.text,fontSize:13,padding:"6px 10px",outline:"none"};return e.jsxs("div",{style:{display:"flex",flexDirection:"column",height:"100vh",background:n.bg,overflow:"hidden"},children:[e.jsxs("header",{style:{display:"flex",alignItems:"center",gap:10,padding:"8px 16px",background:n.card,borderBottom:`1px solid ${n.border}`,flexShrink:0,flexWrap:"wrap"},children:[e.jsxs(y,{onClick:()=>c("/teacher/latex-documents"),children:[e.jsx(xe,{size:14})," Danh sách"]}),e.jsx("input",{type:"text",value:d,onChange:t=>g(t.target.value),onBlur:()=>d.trim()&&S(s,d.trim()),placeholder:"Tên tài liệu",style:{...q,flex:1,minWidth:160,fontSize:15,fontWeight:600}}),e.jsxs("select",{value:oe,onChange:t=>le(t.target.value),style:{...q,minWidth:200,cursor:"pointer"},children:[e.jsx("option",{value:"",children:"Chọn mẫu..."}),Y.map(t=>e.jsx("option",{value:t.id,children:t.name},t.id))]}),e.jsxs(y,{onClick:ae,disabled:$,children:[$?e.jsx(b,{size:14,style:{animation:"spin 1s linear infinite"}}):e.jsx(be,{size:14}),"Lưu"]}),e.jsxs("button",{onClick:L,disabled:l,title:"Biên dịch LaTeX sang PDF (cần Docker TeX Live)",style:{background:l?"#15803d":"#16a34a",border:"none",borderRadius:8,color:"#fff",cursor:l?"not-allowed":"pointer",opacity:l?.75:1,padding:"6px 14px",fontSize:13,fontWeight:600,display:"inline-flex",alignItems:"center",gap:6},children:[l?e.jsx(b,{size:14,style:{animation:"spin 1s linear infinite"}}):e.jsx(D,{size:14}),"Biên dịch"]}),e.jsxs("div",{style:{position:"relative"},children:[e.jsx(y,{onClick:()=>w(!v),active:v,title:"Lịch sử phiên bản",children:e.jsx(ye,{size:14})}),v&&e.jsxs("div",{style:{position:"absolute",top:"110%",right:0,zIndex:50,background:n.card,border:`1px solid ${n.border2}`,borderRadius:12,minWidth:260,maxHeight:300,overflowY:"auto",boxShadow:"0 8px 32px rgba(0,0,0,0.5)"},children:[e.jsx("div",{style:{padding:"10px 14px",borderBottom:`1px solid ${n.border}`,color:n.text,fontWeight:700,fontSize:13},children:"Lịch sử phiên bản"}),F.length===0?e.jsx("div",{style:{padding:"12px 14px",color:n.muted,fontSize:13},children:"Chưa có phiên bản"}):F.map(t=>e.jsxs("button",{onClick:()=>ue(t.id),disabled:z===t.id,style:{display:"block",width:"100%",textAlign:"left",background:"none",border:"none",padding:"10px 14px",color:n.text,cursor:z===t.id?"not-allowed":"pointer",fontSize:13,borderBottom:`1px solid ${n.border}`,opacity:z===t.id?.5:1},onMouseEnter:o=>o.currentTarget.style.background=n.card2,onMouseLeave:o=>o.currentTarget.style.background="none",children:[new Date(t.createdAt).toLocaleString("vi-VN")," ",e.jsxs("span",{style:{color:n.muted},children:["(",t.trigger==="compile"?"Sau biên dịch":"Lưu",")"]})]},t.id))]})]}),ee&&e.jsxs(y,{onClick:()=>P(!0),title:"Chia sẻ",children:[e.jsx(je,{size:14})," Chia sẻ"]})]}),e.jsxs("div",{style:{flex:1,minHeight:0,display:"flex",overflow:"hidden"},children:[e.jsxs("div",{style:{flex:1,minWidth:0,display:"flex",flexDirection:"column",borderRight:`1px solid ${n.border}`},children:[e.jsxs("div",{style:{padding:"8px 14px",background:n.card2,borderBottom:`1px solid ${n.border}`,flexShrink:0,display:"flex",alignItems:"center",gap:8},children:[e.jsx(J,{size:14,style:{color:n.muted}}),e.jsx("span",{style:{color:n.muted,fontSize:13,fontWeight:600},children:"main.tex"})]}),e.jsx("div",{style:{flex:1,minHeight:0},children:e.jsx(Ie,{value:s,onChange:u,height:"100%"})})]}),e.jsxs("div",{style:{flex:1,minWidth:0,display:"flex",flexDirection:"column"},children:[e.jsxs("div",{style:{padding:"8px 14px",background:n.card2,borderBottom:`1px solid ${n.border}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"space-between"},children:[e.jsx("span",{style:{color:n.muted,fontSize:13,fontWeight:600},children:"Xem PDF"}),e.jsxs("div",{style:{display:"flex",gap:6},children:[e.jsx(y,{onClick:ce,disabled:!p,title:"Tải xuống PDF",children:e.jsx(ke,{size:13})}),e.jsx(y,{onClick:de,disabled:!p,title:"In PDF",children:e.jsx(Ce,{size:13})}),e.jsxs("button",{onClick:L,disabled:l,style:{background:"#16a34a",border:"none",borderRadius:7,color:"#fff",cursor:l?"not-allowed":"pointer",opacity:l?.7:1,padding:"5px 12px",fontSize:12,fontWeight:600,display:"inline-flex",alignItems:"center",gap:5},children:[l?e.jsx(b,{size:12,style:{animation:"spin 1s linear infinite"}}):e.jsx(D,{size:12}),"Biên dịch lại"]})]})]}),e.jsx("div",{style:{flex:1,minHeight:0,overflow:"hidden",background:"#1a1a2e"},children:A?e.jsxs("div",{style:{height:"100%",overflowY:"auto",padding:20},children:[e.jsxs("div",{style:{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:10,padding:16,marginBottom:16},children:[e.jsx("p",{style:{color:"#f87171",fontWeight:700,margin:"0 0 6px"},children:"Biên dịch thất bại (422)"}),e.jsx("p",{style:{color:"#fca5a5",fontSize:13,margin:0},children:"Đây là lỗi nội dung LaTeX hoặc package/font, không phải lỗi đăng nhập."})]}),e.jsx("pre",{style:{background:n.card,border:`1px solid ${n.border}`,borderRadius:10,padding:16,color:n.text,fontSize:12,whiteSpace:"pre-wrap",margin:0},children:A})]}):p?e.jsx("iframe",{src:p,title:"PDF preview",style:{width:"100%",height:"100%",border:"none"}}):e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",height:"100%",textAlign:"center",padding:32,color:n.muted},children:[e.jsx(J,{size:48,style:{opacity:.4,marginBottom:16}}),e.jsx("p",{style:{fontWeight:600,color:n.text,margin:"0 0 8px"},children:"Chưa có bản PDF"}),e.jsx("p",{style:{fontSize:13,margin:"0 0 24px",maxWidth:260},children:'Nhấn "Biên dịch" trên thanh công cụ để biên dịch LaTeX và xem PDF tại đây.'}),e.jsxs("button",{onClick:L,disabled:l,style:{background:"#16a34a",border:"none",borderRadius:9,color:"#fff",cursor:l?"not-allowed":"pointer",padding:"10px 20px",fontSize:14,fontWeight:600,display:"inline-flex",alignItems:"center",gap:8},children:[l?e.jsx(b,{size:15,style:{animation:"spin 1s linear infinite"}}):e.jsx(D,{size:15}),"Biên dịch"]})]})})]})]}),T&&e.jsx("div",{style:{position:"fixed",inset:0,zIndex:60,background:"rgba(0,0,0,0.7)",display:"flex",alignItems:"center",justifyContent:"center"},onClick:t=>{t.target===t.currentTarget&&P(!1)},children:e.jsxs("div",{style:{background:n.card,border:`1px solid ${n.border2}`,borderRadius:16,padding:28,width:"90%",maxWidth:480},children:[e.jsx("h2",{style:{color:n.text,fontWeight:700,fontSize:18,margin:"0 0 20px"},children:"Chia sẻ dự án"}),e.jsxs("div",{style:{display:"flex",gap:8,marginBottom:20},children:[e.jsx("input",{placeholder:"Email người dùng",value:f,onChange:t=>_(t.target.value),onKeyDown:t=>t.key==="Enter"&&X(),style:{flex:1,background:n.card2,border:`1px solid ${n.border2}`,borderRadius:8,color:n.text,fontSize:13,padding:"8px 12px",outline:"none"}}),e.jsxs("select",{value:M,onChange:t=>re(t.target.value),style:{background:n.card2,border:`1px solid ${n.border2}`,borderRadius:8,color:n.text,fontSize:13,padding:"8px 10px",cursor:"pointer"},children:[e.jsx("option",{value:"VIEW",children:"Xem"}),e.jsx("option",{value:"EDIT",children:"Chỉnh sửa"})]}),e.jsx("button",{onClick:X,disabled:C||!f.trim(),style:{background:n.purple,border:"none",borderRadius:8,color:"#fff",cursor:C||!f.trim()?"not-allowed":"pointer",opacity:C||!f.trim()?.6:1,padding:"8px 16px",fontSize:13,fontWeight:600},children:C?e.jsx(b,{size:13,style:{animation:"spin 1s linear infinite"}}):"Thêm"})]}),e.jsx("p",{style:{color:n.muted,fontSize:13,fontWeight:600,margin:"0 0 8px"},children:"Cộng tác viên"}),V.length===0?e.jsx("p",{style:{color:n.muted,fontSize:13},children:"Chưa có ai được chia sẻ"}):e.jsx("ul",{style:{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:8},children:V.map(t=>e.jsxs("li",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",background:n.card2,border:`1px solid ${n.border}`,borderRadius:8,padding:"8px 12px"},children:[e.jsx("span",{style:{color:n.text,fontSize:13},children:t.email||t.name||t.userId}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:8},children:[e.jsxs("span",{style:{color:n.muted,fontSize:12},children:["(",t.role,")"]}),e.jsx("button",{onClick:()=>he(t.userId),style:{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:6,color:"#f87171",cursor:"pointer",padding:"3px 6px",lineHeight:1},children:e.jsx(ve,{size:13})})]})]},t.userId))}),e.jsx("div",{style:{display:"flex",justifyContent:"flex-end",marginTop:24},children:e.jsx("button",{onClick:()=>P(!1),style:{background:n.card2,border:`1px solid ${n.border2}`,borderRadius:8,color:n.muted,cursor:"pointer",padding:"8px 20px",fontSize:14},children:"Đóng"})})]})}),v&&e.jsx("div",{style:{position:"fixed",inset:0,zIndex:40},onClick:()=>w(!1)})]})}export{Ve as default};
