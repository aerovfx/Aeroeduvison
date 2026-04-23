import{u as L,c as S,d as $,j as e}from"./query-vendor-G04g7eLE.js";import{f as Q,b as R,r as j,L as b}from"./react-vendor-DgwaEaxy.js";import{c as k}from"./courses.service-CCJFTbtk.js";import{L as P,d as V,I as D,c as G,j as y,o as p}from"./index-CCRtQGNt.js";import{P as W}from"./play-BvnxXMv1.js";import{T as q}from"./thumbs-up-zCZxIT_c.js";import"./three-vendor-D5zvyadk.js";import"./chart-vendor-BR-91hsK.js";import"./form-vendor-C7Om6Kk-.js";const u={id:"ch-2",name:"Động lực học chuyển động thẳng",description:"Nghiên cứu về vận tốc, gia tốc và chuyển động thẳng đều và biến đổi đều.",videoUrl:"https://www.youtube.com/embed/ZM8ECpBuQYE",muxPlaybackId:null,content:`## Mục tiêu bài học

Sau bài học này, bạn sẽ có thể:
- Phân biệt **chuyển động thẳng đều** và **chuyển động thẳng biến đổi đều**
- Tính toán vận tốc trung bình và tức thời
- Áp dụng phương trình chuyển động để giải bài tập

---

## 1. Vận tốc và tốc độ

**Tốc độ trung bình** là đại lượng vô hướng:

\`\`\`
v_tb = s / t
\`\`\`

**Vận tốc tức thời** là giới hạn của tỉ số Δs/Δt khi Δt → 0.

---

## 2. Gia tốc

Gia tốc là đại lượng đặc trưng cho sự thay đổi vận tốc theo thời gian:

\`\`\`
a = Δv / Δt = (v₂ - v₁) / (t₂ - t₁)
\`\`\`

### Đơn vị: m/s²

---

## 3. Phương trình chuyển động thẳng biến đổi đều

| Đại lượng | Công thức |
|-----------|-----------|
| Vận tốc | v = v₀ + at |
| Quãng đường | s = v₀t + ½at² |
| Vận tốc² | v² = v₀² + 2as |

---

## Bài tập ví dụ

Một xe ô tô bắt đầu từ trạng thái đứng yên, sau 10 giây đạt vận tốc 20 m/s.
Tính gia tốc của xe.

**Giải:**
- v₀ = 0, v = 20 m/s, t = 10 s
- a = (v - v₀) / t = (20 - 0) / 10 = **2 m/s²**
`,position:2,duration:60},T={id:"ch-1",name:"Giới thiệu về Cơ học Newtonian"},E={id:"ch-3",name:"Chuyển động tròn và lực hướng tâm"};function I({content:s}){const l=s.split(`
`),n=[];let o=!1,d=[];const x=t=>{if(d.length<2)return;const a=d[0],m=d.slice(2);n.push(e.jsx("div",{className:"overflow-x-auto my-4",children:e.jsxs("table",{className:"w-full text-sm border-collapse",children:[e.jsx("thead",{children:e.jsx("tr",{className:"bg-muted/50",children:a.map((r,c)=>e.jsx("th",{className:"border border-border px-3 py-2 text-left font-semibold text-foreground",children:r.trim()},c))})}),e.jsx("tbody",{children:m.map((r,c)=>e.jsx("tr",{className:"even:bg-muted/20",children:r.map((h,g)=>e.jsx("td",{className:"border border-border px-3 py-2 text-muted-foreground",children:h.trim()},g))},c))})]})},t)),d=[],o=!1};return l.forEach((t,a)=>{if(t.startsWith("|")){o=!0,d.push(t.split("|").filter((m,r)=>r>0&&r<t.split("|").length-1));return}if(o&&x(`table-${a}`),t.startsWith("## "))n.push(e.jsx("h2",{className:"text-lg font-bold text-foreground mt-6 mb-3",children:t.slice(3)},a));else if(t.startsWith("### "))n.push(e.jsx("h3",{className:"text-base font-semibold text-foreground mt-4 mb-2",children:t.slice(4)},a));else if(t.startsWith("---"))n.push(e.jsx("hr",{className:"border-border my-4"},a));else if(!t.startsWith("```"))if(t.startsWith("- "))n.push(e.jsx("li",{className:"ml-4 text-sm text-muted-foreground list-disc mb-1",children:t.slice(2).replace(/\*\*(.*?)\*\*/g,"").trim()},a));else if(t.trim()==="")n.push(e.jsx("div",{className:"h-2"},a));else{const m=t.split(/\*\*(.*?)\*\*/g);n.push(e.jsx("p",{className:"text-sm text-muted-foreground leading-relaxed",children:m.map((r,c)=>c%2===1?e.jsx("strong",{className:"font-semibold text-foreground",children:r},c):r)},a))}}),o&&x("table-final"),e.jsx("div",{className:"space-y-1",children:n})}function X(){const{courseId:s,chapterId:l}=Q();R();const n=L(),[o,d]=j.useState(!1),[x,t]=j.useState("content"),[a,m]=j.useState(!1),{data:r,isLoading:c}=S({queryKey:["chapter",s,l],queryFn:()=>k.getChapter(s,l),enabled:!!s&&!!l,retry:!1}),h=r?.chapter||u,g=r?.nextChapter||E,N=T,f=$({mutationFn:()=>k.updateProgress(s,l,!0),onSuccess:()=>{d(!0),n.invalidateQueries({queryKey:["courseProgress",s]}),n.invalidateQueries({queryKey:["course",s]})}});if(c)return e.jsx("div",{className:"flex items-center justify-center min-h-[60vh]",children:e.jsx(P,{className:"w-8 h-8 animate-spin text-primary"})});const M=h.videoUrl||u.videoUrl;return e.jsxs("div",{className:"animate-fade-in max-w-6xl mx-auto",children:[e.jsxs("div",{className:"flex items-center justify-between px-6 py-3 border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10",children:[e.jsxs(b,{to:`/courses/${s}`,className:"flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors",children:[e.jsx(V,{className:"w-4 h-4"}),"Quay lại khoá học"]}),e.jsxs("div",{className:"flex items-center gap-2",children:[N&&e.jsxs(b,{to:`/courses/${s}/chapters/${N.id}`,className:"flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted",children:[e.jsx(D,{className:"w-4 h-4"})," Trước"]}),g&&e.jsxs(b,{to:`/courses/${s}/chapters/${g.id}`,className:"flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted",children:["Tiếp ",e.jsx(G,{className:"w-4 h-4"})]})]})]}),e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-5 gap-0 min-h-[calc(100vh-8rem)]",children:[e.jsxs("div",{className:"lg:col-span-3 border-r border-border",children:[e.jsxs("div",{className:"relative bg-black aspect-video",children:[!a&&e.jsx("div",{className:"absolute inset-0 flex items-center justify-center bg-black/80",children:e.jsxs("div",{className:"text-center text-white/60",children:[e.jsx(W,{className:"w-12 h-12 mx-auto mb-2 opacity-50"}),e.jsx("p",{className:"text-sm",children:"Đang tải video..."})]})}),e.jsx("iframe",{src:M,className:"w-full h-full",allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",allowFullScreen:!0,onLoad:()=>m(!0)})]}),e.jsxs("div",{className:"px-5 py-4 border-b border-border flex items-start justify-between gap-4",children:[e.jsxs("div",{children:[e.jsx("h1",{className:"text-lg font-bold text-foreground",children:h.name}),e.jsx("p",{className:"text-sm text-muted-foreground mt-0.5",children:h.description})]}),e.jsxs("button",{onClick:()=>f.mutate(),disabled:o||f.isPending,className:p("flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shrink-0 transition-all",o?"bg-green-500/10 text-green-600 cursor-default":"bg-primary text-white hover:bg-primary/90"),children:[f.isPending?e.jsx(P,{className:"w-4 h-4 animate-spin"}):o?e.jsx(y,{className:"w-4 h-4"}):e.jsx(y,{className:"w-4 h-4"}),o?"Đã hoàn thành":"Đánh dấu hoàn thành"]})]}),e.jsx("div",{className:"flex border-b border-border",children:["content","notes"].map(i=>e.jsx("button",{onClick:()=>t(i),className:p("px-5 py-3 text-sm font-medium transition-colors",x===i?"text-primary border-b-2 border-primary":"text-muted-foreground hover:text-foreground"),children:i==="content"?"Nội dung bài":"Ghi chú"},i))}),e.jsx("div",{className:"p-5",children:x==="content"?e.jsx(I,{content:h.content||u.content}):e.jsxs("div",{children:[e.jsx("textarea",{className:"w-full h-48 bg-background border border-border rounded-xl p-3 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/20",placeholder:"Ghi chú của bạn về bài học này..."}),e.jsx("button",{className:"mt-2 text-xs text-primary hover:underline",children:"Lưu ghi chú"})]})})]}),e.jsxs("div",{className:"lg:col-span-2 overflow-y-auto",children:[e.jsx("div",{className:"px-4 py-3 border-b border-border",children:e.jsx("h3",{className:"text-sm font-semibold text-foreground",children:"Danh sách chương"})}),e.jsx("div",{className:"divide-y divide-border",children:u&&[T,u,E].map((i,w)=>{const v=i.id===l||i.id===u.id,C=w===0;return e.jsxs(b,{to:`/courses/${s}/chapters/${i.id}`,className:p("flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/30",v&&"bg-primary/5 border-l-2 border-primary"),children:[e.jsx("div",{className:"w-6 h-6 rounded-full shrink-0 flex items-center justify-center",children:C?e.jsx(y,{className:"w-4 h-4 text-green-500"}):e.jsx("span",{className:p("text-xs font-bold",v?"text-primary":"text-muted-foreground"),children:w+1})}),e.jsx("span",{className:p("text-sm truncate",v?"text-primary font-medium":C?"text-muted-foreground line-through":"text-foreground"),children:i.name})]},i.id)})}),e.jsxs("div",{className:"px-4 py-4 border-t border-border mt-auto",children:[e.jsx("p",{className:"text-xs text-muted-foreground mb-2",children:"Bài học này có hữu ích không?"}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{className:"flex items-center gap-1 text-xs px-3 py-1.5 bg-green-500/10 text-green-600 rounded-lg hover:bg-green-500/20 transition-colors",children:[e.jsx(q,{className:"w-3 h-3"})," Có"]}),e.jsx("button",{className:"flex items-center gap-1 text-xs px-3 py-1.5 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors",children:"Cần cải thiện"})]})]})]})]})]})}export{X as default};
