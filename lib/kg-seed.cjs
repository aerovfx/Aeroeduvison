/**
 * lib/kg-seed.cjs — Dataset seed cho Knowledge Graph (Cây tri thức).
 *
 * Đồ thị tri thức THPT theo CT GDPT 2018, tâm là môn Vật lí 11 (subj-vatli)
 * + Toán 11 + Hoá 11 với các cạnh liên môn (cross-edges). Dùng cho
 * GET /api/kg/seed (idempotent upsert) → /kg/expand render được ngay.
 *
 * Node types: Subject | Chapter | Topic | Concept | Formula
 * Rel types : HAS_CHAPTER | HAS_TOPIC | USES_FORMULA | USES_CONCEPT | RELATES_TO
 */
'use strict';

const N = [];
const E = [];
const n = (id, type, label, description) => { N.push({ id, type, label, description: description || null }); return id; };
const e = (from_id, to_id, rel_type, weight = 1) => {
  E.push({ id: `e-${from_id}__${to_id}__${rel_type}`, from_id, to_id, rel_type, weight });
};

// ══════════════════════════════════════════════════════════════════
// VẬT LÍ 11 (tâm)
// ══════════════════════════════════════════════════════════════════
n('subj-vatli', 'Subject', 'Vật lí 11', 'Môn Vật lí lớp 11 — điện học, từ học, quang học');

// — Chương 1: Điện tích. Điện trường —
n('ch-dientich', 'Chapter', 'Điện tích. Điện trường', 'Tương tác điện, điện trường');
e('subj-vatli', 'ch-dientich', 'HAS_CHAPTER');
n('tp-dinhluat-coulomb', 'Topic', 'Định luật Coulomb', 'Lực tương tác giữa hai điện tích điểm');
n('tp-dien-truong', 'Topic', 'Điện trường & cường độ điện trường', null);
n('tp-dien-the', 'Topic', 'Điện thế. Hiệu điện thế', null);
n('tp-tu-dien', 'Topic', 'Tụ điện', 'Điện dung, năng lượng tụ điện');
e('ch-dientich', 'tp-dinhluat-coulomb', 'HAS_TOPIC');
e('ch-dientich', 'tp-dien-truong', 'HAS_TOPIC');
e('ch-dientich', 'tp-dien-the', 'HAS_TOPIC');
e('ch-dientich', 'tp-tu-dien', 'HAS_TOPIC');
n('fm-coulomb', 'Formula', 'F = k·q₁q₂/r²', 'Định luật Coulomb');
n('fm-cuongdo-E', 'Formula', 'E = F/q = k·Q/r²', 'Cường độ điện trường');
n('fm-hieudienthe', 'Formula', 'U = A/q', 'Hiệu điện thế');
n('fm-diendung', 'Formula', 'C = Q/U', 'Điện dung của tụ');
e('tp-dinhluat-coulomb', 'fm-coulomb', 'USES_FORMULA');
e('tp-dien-truong', 'fm-cuongdo-E', 'USES_FORMULA');
e('tp-dien-the', 'fm-hieudienthe', 'USES_FORMULA');
e('tp-tu-dien', 'fm-diendung', 'USES_FORMULA');

// — Chương 2: Dòng điện không đổi —
n('ch-dongdien', 'Chapter', 'Dòng điện không đổi', 'Cường độ dòng điện, định luật Ohm');
e('subj-vatli', 'ch-dongdien', 'HAS_CHAPTER');
n('tp-cuongdo-I', 'Topic', 'Cường độ dòng điện', null);
n('tp-dinhluat-ohm', 'Topic', 'Định luật Ohm cho toàn mạch', null);
n('tp-cong-suat-dien', 'Topic', 'Điện năng. Công suất điện', null);
e('ch-dongdien', 'tp-cuongdo-I', 'HAS_TOPIC');
e('ch-dongdien', 'tp-dinhluat-ohm', 'HAS_TOPIC');
e('ch-dongdien', 'tp-cong-suat-dien', 'HAS_TOPIC');
n('fm-I', 'Formula', 'I = q/t', 'Cường độ dòng điện');
n('fm-ohm', 'Formula', 'I = ξ/(R+r)', 'Định luật Ohm toàn mạch');
n('fm-congsuat', 'Formula', 'P = U·I', 'Công suất điện');
e('tp-cuongdo-I', 'fm-I', 'USES_FORMULA');
e('tp-dinhluat-ohm', 'fm-ohm', 'USES_FORMULA');
e('tp-cong-suat-dien', 'fm-congsuat', 'USES_FORMULA');

// — Chương 4: Từ trường —
n('ch-tutruong', 'Chapter', 'Từ trường', 'Lực từ, cảm ứng từ');
e('subj-vatli', 'ch-tutruong', 'HAS_CHAPTER');
n('tp-luc-tu', 'Topic', 'Lực từ. Cảm ứng từ', null);
n('tp-luc-lorentz', 'Topic', 'Lực Lorentz', null);
e('ch-tutruong', 'tp-luc-tu', 'HAS_TOPIC');
e('ch-tutruong', 'tp-luc-lorentz', 'HAS_TOPIC');
n('fm-luc-tu', 'Formula', 'F = B·I·l·sinα', 'Lực từ tác dụng lên dây dẫn');
n('fm-lorentz', 'Formula', 'f = q·v·B·sinα', 'Lực Lorentz');
e('tp-luc-tu', 'fm-luc-tu', 'USES_FORMULA');
e('tp-luc-lorentz', 'fm-lorentz', 'USES_FORMULA');

// — Chương 5: Cảm ứng điện từ —
n('ch-camung', 'Chapter', 'Cảm ứng điện từ', 'Từ thông, suất điện động cảm ứng');
e('subj-vatli', 'ch-camung', 'HAS_CHAPTER');
n('tp-tuthong', 'Topic', 'Từ thông. Cảm ứng điện từ', null);
n('tp-suat-dien-dong', 'Topic', 'Suất điện động cảm ứng', null);
e('ch-camung', 'tp-tuthong', 'HAS_TOPIC');
e('ch-camung', 'tp-suat-dien-dong', 'HAS_TOPIC');
n('fm-tuthong', 'Formula', 'Φ = B·S·cosα', 'Từ thông');
n('fm-faraday', 'Formula', 'e_c = -ΔΦ/Δt', 'Định luật Faraday');
e('tp-tuthong', 'fm-tuthong', 'USES_FORMULA');
e('tp-suat-dien-dong', 'fm-faraday', 'USES_FORMULA');

// — Chương 6: Khúc xạ ánh sáng —
n('ch-khucxa', 'Chapter', 'Khúc xạ ánh sáng', 'Định luật khúc xạ, phản xạ toàn phần');
e('subj-vatli', 'ch-khucxa', 'HAS_CHAPTER');
n('tp-dinhluat-khucxa', 'Topic', 'Định luật khúc xạ ánh sáng', null);
n('tp-phanxa-toanphan', 'Topic', 'Phản xạ toàn phần', null);
e('ch-khucxa', 'tp-dinhluat-khucxa', 'HAS_TOPIC');
e('ch-khucxa', 'tp-phanxa-toanphan', 'HAS_TOPIC');
n('fm-khucxa', 'Formula', 'n₁·sin(i) = n₂·sin(r)', 'Định luật khúc xạ (Snell)');
e('tp-dinhluat-khucxa', 'fm-khucxa', 'USES_FORMULA');

// — Chương 7: Mắt. Các dụng cụ quang —
n('ch-matquang', 'Chapter', 'Mắt. Các dụng cụ quang học', 'Thấu kính, mắt, kính lúp, kính hiển vi');
e('subj-vatli', 'ch-matquang', 'HAS_CHAPTER');
n('tp-thau-kinh', 'Topic', 'Thấu kính mỏng', null);
n('tp-mat', 'Topic', 'Mắt', null);
e('ch-matquang', 'tp-thau-kinh', 'HAS_TOPIC');
e('ch-matquang', 'tp-mat', 'HAS_TOPIC');
n('fm-thaukinh', 'Formula', '1/f = 1/d + 1/d′', 'Công thức thấu kính');
e('tp-thau-kinh', 'fm-thaukinh', 'USES_FORMULA');

// Concept liên kết nội môn
n('cc-dien-tich', 'Concept', 'Điện tích', 'Đại lượng đặc trưng cho vật nhiễm điện');
e('tp-dinhluat-coulomb', 'cc-dien-tich', 'USES_CONCEPT');
e('tp-cuongdo-I', 'cc-dien-tich', 'USES_CONCEPT');
e('tp-luc-lorentz', 'cc-dien-tich', 'USES_CONCEPT');

// ══════════════════════════════════════════════════════════════════
// TOÁN 11 (liên môn)
// ══════════════════════════════════════════════════════════════════
n('subj-toan', 'Subject', 'Toán 11', 'Lượng giác, dãy số, giới hạn, đạo hàm');
n('ch-luonggiac', 'Chapter', 'Hàm số lượng giác', null);
n('ch-daoham', 'Chapter', 'Đạo hàm', null);
n('ch-gioihan', 'Chapter', 'Giới hạn', null);
e('subj-toan', 'ch-luonggiac', 'HAS_CHAPTER');
e('subj-toan', 'ch-daoham', 'HAS_CHAPTER');
e('subj-toan', 'ch-gioihan', 'HAS_CHAPTER');
n('tp-daoham-dn', 'Topic', 'Định nghĩa đạo hàm', null);
n('tp-sin-cos', 'Topic', 'Hàm sin, cos', null);
e('ch-daoham', 'tp-daoham-dn', 'HAS_TOPIC');
e('ch-luonggiac', 'tp-sin-cos', 'HAS_TOPIC');

// Cross-edges Lý ↔ Toán
e('tp-cuongdo-I', 'tp-daoham-dn', 'RELATES_TO', 0.8);          // i = dq/dt
e('tp-suat-dien-dong', 'tp-daoham-dn', 'RELATES_TO', 0.8);     // e = -dΦ/dt
e('tp-luc-tu', 'tp-sin-cos', 'RELATES_TO', 0.6);               // sinα
e('tp-dinhluat-khucxa', 'tp-sin-cos', 'RELATES_TO', 0.6);

// ══════════════════════════════════════════════════════════════════
// HOÁ 11 (liên môn)
// ══════════════════════════════════════════════════════════════════
n('subj-hoa', 'Subject', 'Hoá học 11', 'Sự điện li, nitơ–photpho, đại cương hữu cơ');
n('ch-dienli', 'Chapter', 'Sự điện li', null);
n('ch-nito', 'Chapter', 'Nitơ – Photpho', null);
e('subj-hoa', 'ch-dienli', 'HAS_CHAPTER');
e('subj-hoa', 'ch-nito', 'HAS_CHAPTER');
n('tp-chat-dien-li', 'Topic', 'Chất điện li. Độ điện li', null);
e('ch-dienli', 'tp-chat-dien-li', 'HAS_TOPIC');

// Cross-edge Hoá ↔ Lý: dòng điện trong chất điện phân
e('tp-chat-dien-li', 'tp-cuongdo-I', 'RELATES_TO', 0.7);
e('cc-dien-tich', 'tp-chat-dien-li', 'RELATES_TO', 0.5);

module.exports = { NODES: N, EDGES: E };
