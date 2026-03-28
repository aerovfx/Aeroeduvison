#!/usr/bin/env python3
"""
Create new question banks for additional subjects and grade levels
to prepare for importing questions into the question bank system.
"""

import json
import os
from pathlib import Path

DATA_DIR = Path("/Users/pixibox/Aeroeduvison/data")

# New subjects and grade levels to add
NEW_QUESTION_BANKS = {
    # Tiếng Việt for primary school (grades 1-5)
    "tieng_viet_lop_1": {
        "meta": {
            "title": "Trắc nghiệm Tiếng Việt 1 - Bộ đề ôn tập",
            "provider": "Aeroedu Vision",
            "subject": "Tiếng Việt",
            "grade": "1",
            "chapter": "Ôn tập",
            "topic": "Tổng hợp kiến thức Tiếng Việt lớp 1"
        },
        "description": "Ngân hàng câu hỏi trắc nghiệm Tiếng Việt lớp 1 giúp học sinh ôn tập và củng cố kiến thức về vần, từ ngữ, câu và tập đọc.",
        "questions": [
            {
                "question_number": 1,
                "question": "Vần 'an' có trong từ nào sau đây?",
                "options": [
                    "Bàn ghế",
                    "Cái ca",
                    "Con mèo",
                    "Quyển vở"
                ],
                "correctAnswer": "A",
                "explanation": "Từ 'Bàn' có chứa vần 'an'."
            },
            {
                "question_number": 2,
                "question": "Từ nào sau đây viết đúng chính tả?",
                "options": [
                    "con gò",
                    "con cò",
                    "con cồ",
                    "con cờ"
                ],
                "correctAnswer": "B",
                "explanation": "'Con cò' là từ viết đúng chính tả, chỉ một loài chim."
            },
            {
                "question_number": 3,
                "question": "Câu nào sau đây là câu hoàn chỉnh?",
                "options": [
                    "Em học bài",
                    "Đi học",
                    "Ăn cơm",
                    "Ngủ ngon"
                ],
                "correctAnswer": "A",
                "explanation": "'Em học bài' là câu hoàn chỉnh có chủ ngữ và vị ngữ."
            },
            {
                "question_number": 4,
                "question": "Âm đầu 'ng' có trong từ nào?",
                "options": [
                    "Cái bàn",
                    "Ngôi nhà",
                    "Quyển sách",
                    "Cây bút"
                ],
                "correctAnswer": "B",
                "explanation": "Từ 'Ngôi' bắt đầu bằng âm 'ng'."
            },
            {
                "question_number": 5,
                "question": "Dấu hỏi đặt ở đâu trong từ 'quyển'?",
                "options": [
                    "Trên nguyên âm 'ê'",
                    "Trên nguyên âm 'y'",
                    "Dưới nguyên âm 'y'",
                    "Sau chữ 'n'"
                ],
                "correctAnswer": "B",
                "explanation": "Dấu hỏi đặt trên nguyên âm 'y' trong từ 'quyển'."
            }
        ],
        "resources": {
            "related_topics": [
                "Vần và âm",
                "Chính tả",
                "Tập đọc",
                "Luyện từ và câu"
            ]
        }
    },
    
    # Tiếng Anh for grade 6
    "tieng_anh_lop_6": {
        "meta": {
            "title": "Trắc nghiệm Tiếng Anh 6 - Unit 1: My New School",
            "provider": "Aeroedu Vision",
            "subject": "Tiếng Anh",
            "grade": "6",
            "chapter": "1",
            "topic": "My New School"
        },
        "description": "Ngân hàng câu hỏi trắc nghiệm Tiếng Anh lớp 6 Unit 1 giúp học sinh ôn tập từ vựng, ngữ pháp về trường học mới.",
        "questions": [
            {
                "question_number": 1,
                "question": "Choose the word that has different stress pattern: school, subject, homework, computer",
                "options": [
                    "school",
                    "subject",
                    "homework",
                    "computer"
                ],
                "correctAnswer": "D",
                "explanation": "'Computer' has stress on the second syllable (com-PU-ter), while others have stress on the first syllable."
            },
            {
                "question_number": 2,
                "question": "My new school _______ very big and beautiful.",
                "options": [
                    "am",
                    "is",
                    "are",
                    "be"
                ],
                "correctAnswer": "B",
                "explanation": "Subject 'school' is singular, so we use 'is'."
            },
            {
                "question_number": 3,
                "question": "We _______ English every Monday and Wednesday.",
                "options": [
                    "has",
                    "have",
                    "having",
                    "to have"
                ],
                "correctAnswer": "B",
                "explanation": "Present simple tense with 'we' uses 'have'."
            },
            {
                "question_number": 4,
                "question": "_______ you walk to school every day?",
                "options": [
                    "Does",
                    "Is",
                    "Do",
                    "Are"
                ],
                "correctAnswer": "C",
                "explanation": "Question form with 'you' uses 'Do'."
            },
            {
                "question_number": 5,
                "question": "My best friend sits _______ me in class.",
                "options": [
                    "next",
                    "next to",
                    "to next",
                    "beside to"
                ],
                "correctAnswer": "B",
                "explanation": "'Next to' is the correct preposition phrase."
            }
        ],
        "resources": {
            "related_topics": [
                "Vocabulary: School things",
                "Grammar: Present Simple",
                "Pronunciation: Word stress",
                "Speaking: Talking about school"
            ]
        }
    },
    
    # Giáo dục công dân for grade 8
    "gdcd_lop_8": {
        "meta": {
            "title": "Trắc nghiệm Giáo dục công dân 8 - Bài 1: Tôn trọng lẽ phải",
            "provider": "Aeroedu Vision",
            "subject": "Giáo dục công dân",
            "grade": "8",
            "chapter": "1",
            "topic": "Tôn trọng lẽ phải"
        },
        "description": "Ngân hàng câu hỏi trắc nghiệm Giáo dục công dân lớp 8 giúp học sinh hiểu về tôn trọng lẽ phải và rèn luyện phẩm chất đạo đức.",
        "questions": [
            {
                "question_number": 1,
                "question": "Thế nào là tôn trọng lẽ phải?",
                "options": [
                    "Công nhận, ủng hộ và bảo vệ những điều đúng đắn",
                    "Luôn đồng ý với ý kiến của người khác",
                    "Không bao giờ tranh luận với ai",
                    "Làm theo số đông"
                ],
                "correctAnswer": "A",
                "explanation": "Tôn trọng lẽ phải là công nhận, ủng hộ và bảo vệ những điều đúng đắn, phù hợp với đạo đức và pháp luật."
            },
            {
                "question_number": 2,
                "question": "Hành vi nào sau đây thể hiện tôn trọng lẽ phải?",
                "options": [
                    "Dũng cảm chỉ ra việc làm sai của bạn",
                    "Im lặng khi thấy việc sai trái",
                    "Bao che cho bạn khi mắc lỗi",
                    "Làm theo ý mình không quan tâm đúng sai"
                ],
                "correctAnswer": "A",
                "explanation": "Dũng cảm chỉ ra việc làm sai của bạn là thể hiện tôn trọng lẽ phải."
            },
            {
                "question_number": 3,
                "question": "Khi phát hiện bạn thân quay cóp trong giờ kiểm tra, em nên làm gì?",
                "options": [
                    "Nhắc nhở bạn không nên làm vậy",
                    "Làm ngơ như không thấy",
                    "Báo ngay với cô giáo",
                    "Cùng quay cóp với bạn"
                ],
                "correctAnswer": "A",
                "explanation": "Nhắc nhở bạn là cách thể hiện tôn trọng lẽ phải và giúp bạn nhận ra lỗi sai."
            },
            {
                "question_number": 4,
                "question": "Tôn trọng lẽ phải mang lại lợi ích gì?",
                "options": [
                    "Giúp xã hội phát triển lành mạnh",
                    "Làm mất lòng người khác",
                    "Khiến mình bị cô lập",
                    "Không mang lại lợi ích gì"
                ],
                "correctAnswer": "A",
                "explanation": "Tôn trọng lẽ phải giúp xã hội phát triển lành mạnh, công bằng."
            },
            {
                "question_number": 5,
                "question": "Câu tục ngữ nào nói về tôn trọng lẽ phải?",
                "options": [
                    "Đói cho sạch, rách cho thơm",
                    "Ăn quả nhớ kẻ trồng cây",
                    "Học thầy không tày học bạn",
                    "Tiên học lễ, hậu học văn"
                ],
                "correctAnswer": "A",
                "explanation": "'Đói cho sạch, rách cho thơm' khuyên giữ gìn phẩm chất, tôn trọng lẽ phải dù trong hoàn cảnh khó khăn."
            }
        ],
        "resources": {
            "related_topics": [
                "Tôn trọng người khác",
                "Trung thực",
                "Trách nhiệm công dân",
                "Đạo đức học đường"
            ]
        }
    },
    
    # Khoa học tự nhiên for grade 6
    "khtn_lop_6_bai_moi": {
        "meta": {
            "title": "Trắc nghiệm Khoa học tự nhiên 6 - Bài mới: Đa dạng thế giới sống",
            "provider": "Aeroedu Vision",
            "subject": "KHTN",
            "grade": "6",
            "chapter": "Đa dạng sinh học",
            "topic": "Thế giới động vật và thực vật"
        },
        "description": "Ngân hàng câu hỏi trắc nghiệm Khoa học tự nhiên lớp 6 về đa dạng thế giới sống, giúp học sinh khám phá sự phong phú của sinh vật.",
        "questions": [
            {
                "question_number": 1,
                "question": "Sinh vật nào sau đây thuộc giới Thực vật?",
                "options": [
                    "Cây lúa",
                    "Con mèo",
                    "Nấm rơm",
                    "Vi khuẩn"
                ],
                "correctAnswer": "A",
                "explanation": "Cây lúa thuộc giới Thực vật, có khả năng quang hợp."
            },
            {
                "question_number": 2,
                "question": "Động vật nào sau đây là động vật có xương sống?",
                "options": [
                    "Con cá chép",
                    "Con tôm",
                    "Con cua",
                    "Con mực"
                ],
                "correctAnswer": "A",
                "explanation": "Cá chép là động vật có xương sống thuộc lớp Cá."
            },
            {
                "question_number": 3,
                "question": "Quá trình nào giúp cây xanh tạo ra chất hữu cơ?",
                "options": [
                    "Quang hợp",
                    "Hô hấp",
                    "Thoát hơi nước",
                    "Sinh sản"
                ],
                "correctAnswer": "A",
                "explanation": "Quang hợp là quá trình cây xanh sử dụng ánh sáng mặt trời để tạo chất hữu cơ."
            },
            {
                "question_number": 4,
                "question": "Nhóm sinh vật nào có kích thước nhỏ nhất?",
                "options": [
                    "Vi khuẩn",
                    "Nấm",
                    "Thực vật",
                    "Động vật"
                ],
                "correctAnswer": "A",
                "explanation": "Vi khuẩn có kích thước hiển vi, nhỏ nhất trong các nhóm sinh vật."
            },
            {
                "question_number": 5,
                "question": "Hệ cơ quan nào giúp con người trao đổi khí với môi trường?",
                "options": [
                    "Hệ hô hấp",
                    "Hệ tiêu hóa",
                    "Hệ tuần hoàn",
                    "Hệ thần kinh"
                ],
                "correctAnswer": "A",
                "explanation": "Hệ hô hấp giúp trao đổi khí oxy và carbon dioxide với môi trường."
            }
        ],
        "resources": {
            "related_topics": [
                "Phân loại sinh vật",
                "Tế bào",
                "Hệ cơ quan",
                "Bảo vệ môi trường"
            ]
        }
    },
    
    # Tự nhiên và Xã hội for grade 2
    "tnxh_lop_2": {
        "meta": {
            "title": "Trắc nghiệm Tự nhiên và Xã hội 2 - Chủ đề: Gia đình",
            "provider": "Aeroedu Vision",
            "subject": "Tự nhiên và Xã hội",
            "grade": "2",
            "chapter": "Gia đình",
            "topic": "Các thành viên trong gia đình"
        },
        "description": "Ngân hàng câu hỏi trắc nghiệm Tự nhiên và Xã hội lớp 2 giúp học sinh hiểu về gia đình và các mối quan hệ trong gia đình.",
        "questions": [
            {
                "question_number": 1,
                "question": "Gia đình em gồm những ai?",
                "options": [
                    "Ông bà, bố mẹ và con cái",
                    "Chỉ có bố và mẹ",
                    "Chỉ có anh chị em",
                    "Bạn bè"
                ],
                "correctAnswer": "A",
                "explanation": "Gia đình thường gồm ông bà, bố mẹ và con cái sống cùng nhau."
            },
            {
                "question_number": 2,
                "question": "Em nên làm gì để giúp đỡ bố mẹ?",
                "options": [
                    "Tự giác làm việc nhà phù hợp",
                    "Chỉ chơi không làm gì",
                    "Chờ bố mẹ yêu cầu mới làm",
                    "Làm khi có thưởng"
                ],
                "correctAnswer": "A",
                "explanation": "Tự giác làm việc nhà phù hợp với lứa tuổi là cách giúp đỡ bố mẹ tốt nhất."
            },
            {
                "question_number": 3,
                "question": "Khi trong gia đình có người ốm, em nên làm gì?",
                "options": [
                    "Chăm sóc và hỏi thăm",
                    "Mặc kệ vì không liên quan",
                    "Chỉ biết chơi",
                    "Làm ồn ào"
                ],
                "correctAnswer": "A",
                "explanation": "Chăm sóc và hỏi thăm người ốm thể hiện tình yêu thương trong gia đình."
            },
            {
                "question_number": 4,
                "question": "Ngày nào là ngày Gia đình Việt Nam?",
                "options": [
                    "28/6",
                    "1/6",
                    "20/10",
                    "8/3"
                ],
                "correctAnswer": "A",
                "explanation": "Ngày 28/6 hàng năm là ngày Gia đình Việt Nam."
            },
            {
                "question_number": 5,
                "question": "Em cần làm gì để giữ gìn hạnh phúc gia đình?",
                "options": [
                    "Ngoan ngoãn, vâng lời và yêu thương mọi người",
                    "Luôn làm theo ý mình",
                    "Không quan tâm đến ai",
                    "Chỉ chơi với bạn"
                ],
                "correctAnswer": "A",
                "explanation": "Ngoan ngoãn, vâng lời và yêu thương mọi người giúp giữ gìn hạnh phúc gia đình."
            }
        ],
        "resources": {
            "related_topics": [
                "Trường học",
                "Cộng đồng địa phương",
                "Thực vật và động vật",
                "Con người và sức khỏe"
            ]
        }
    },
    
    # Lịch sử và Địa lý for grade 4
    "ls_dia_lop_4": {
        "meta": {
            "title": "Trắc nghiệm Lịch sử và Địa lý 4 - Bài 1: Làm quen với bản đồ",
            "provider": "Aeroedu Vision",
            "subject": "Lịch sử và Địa lý",
            "grade": "4",
            "chapter": "1",
            "topic": "Bản đồ và phương hướng"
        },
        "description": "Ngân hàng câu hỏi trắc nghiệm Lịch sử và Địa lý lớp 4 giúp học sinh làm quen với bản đồ và các kỹ năng địa lý cơ bản.",
        "questions": [
            {
                "question_number": 1,
                "question": "Bản đồ là gì?",
                "options": [
                    "Hình vẽ thu nhỏ của một khu vực hoặc toàn bộ Trái Đất",
                    "Bức tranh vẽ phong cảnh",
                    "Sơ đồ lớp học",
                    "Bức ảnh chụp từ trên cao"
                ],
                "correctAnswer": "A",
                "explanation": "Bản đồ là hình vẽ thu nhỏ của một khu vực hoặc toàn bộ Trái Đất theo một tỷ lệ nhất định."
            },
            {
                "question_number": 2,
                "question": "Trên bản đồ, hướng Bắc thường được chỉ ở vị trí nào?",
                "options": [
                    "Phía trên",
                    "Phía dưới",
                    "Bên trái",
                    "Bên phải"
                ],
                "correctAnswer": "A",
                "explanation": "Trên bản đồ, hướng Bắc thường được chỉ ở phía trên."
            },
            {
                "question_number": 3,
                "question": "Ký hiệu trên bản đồ dùng để làm gì?",
                "options": [
                    "Thể hiện các đối tượng địa lý",
                    "Trang trí cho đẹp",
                    "Ghi chú tên người vẽ",
                    "Không có tác dụng gì"
                ],
                "correctAnswer": "A",
                "explanation": "Ký hiệu trên bản đồ dùng để thể hiện các đối tượng địa lý như sông, núi, thành phố..."
            },
            {
                "question_number": 4,
                "question": "Việt Nam nằm ở khu vực nào của châu Á?",
                "options": [
                    "Đông Nam Á",
                    "Tây Á",
                    "Bắc Á",
                    "Trung Á"
                ],
                "correctAnswer": "A",
                "explanation": "Việt Nam nằm ở khu vực Đông Nam Á."
            },
            {
                "question_number": 5,
                "question": "Thủ đô của Việt Nam là thành phố nào?",
                "options": [
                    "Hà Nội",
                    "Thành phố Hồ Chí Minh",
                    "Đà Nẵng",
                    "Hải Phòng"
                ],
                "correctAnswer": "A",
                "explanation": "Hà Nội là thủ đô của nước Cộng hòa Xã hội Chủ nghĩa Việt Nam."
            }
        ],
        "resources": {
            "related_topics": [
                "Thiên nhiên Việt Nam",
                "Dân cư và hoạt động sản xuất",
                "Lịch sử dựng nước",
                "Bảo vệ môi trường"
            ]
        }
    },
    
    # Đạo đức for grade 3
    "dao_duc_lop_3": {
        "meta": {
            "title": "Trắc nghiệm Đạo đức 3 - Bài 1: Kính yêu Bác Hồ",
            "provider": "Aeroedu Vision",
            "subject": "Đạo đức",
            "grade": "3",
            "chapter": "1",
            "topic": "Kính yêu Bác Hồ"
        },
        "description": "Ngân hàng câu hỏi trắc nghiệm Đạo đức lớp 3 giúp học sinh hiểu và rèn luyện các phẩm chất đạo đức tốt đẹp.",
        "questions": [
            {
                "question_number": 1,
                "question": "Bác Hồ sinh ngày tháng năm nào?",
                "options": [
                    "19/5/1890",
                    "2/9/1945",
                    "1/1/1900",
                    "30/4/1975"
                ],
                "correctAnswer": "A",
                "explanation": "Bác Hồ sinh ngày 19/5/1890 tại làng Sen, Nghệ An."
            },
            {
                "question_number": 2,
                "question": "Em cần làm gì để thể hiện lòng kính yêu Bác Hồ?",
                "options": [
                    "Học tập và làm theo 5 điều Bác Hồ dạy",
                    "Chỉ cần thuộc bài thơ về Bác",
                    "Treo ảnh Bác trong phòng",
                    "Đến thăm lăng Bác"
                ],
                "correctAnswer": "A",
                "explanation": "Học tập và làm theo 5 điều Bác Hồ dạy là cách tốt nhất thể hiện lòng kính yêu Bác."
            },
            {
                "question_number": 3,
                "question": "5 điều Bác Hồ dạy thiếu niên nhi đồng có điều nào sau đây?",
                "options": [
                    "Yêu Tổ quốc, yêu đồng bào",
                    "Học thật giỏi để được thưởng",
                    "Chơi nhiều để khỏe mạnh",
                    "Nghe lời bố mẹ là đủ"
                ],
                "correctAnswer": "A",
                "explanation": "'Yêu Tổ quốc, yêu đồng bào' là điều đầu tiên trong 5 điều Bác Hồ dạy."
            },
            {
                "question_number": 4,
                "question": "Khi gặp thầy cô giáo, em nên làm gì?",
                "options": [
                    "Chào hỏi lễ phép",
                    "Lờ đi không chào",
                    "Chạy trốn",
                    "Chỉ chào khi thầy cô nhìn thấy"
                ],
                "correctAnswer": "A",
                "explanation": "Chào hỏi lễ phép thể hiện sự tôn trọng thầy cô giáo."
            },
            {
                "question_number": 5,
                "question": "Khi nhặt được của rơi, em nên làm gì?",
                "options": [
                    "Nộp cho thầy cô hoặc người lớn",
                    "Giữ làm của riêng",
                    "Bỏ đi không quan tâm",
                    "Cho bạn bè"
                ],
                "correctAnswer": "A",
                "explanation": "Nộp cho thầy cô hoặc người lớn để tìm trả lại cho người mất là hành động trung thực."
            }
        ],
        "resources": {
            "related_topics": [
                "Trung thực",
                "Tôn trọng người khác",
                "Yêu thương gia đình",
                "Bảo vệ môi trường"
            ]
        }
    }
}

def create_question_bank():
    """Create new question bank files."""
    created_count = 0
    
    for filename, content in NEW_QUESTION_BANKS.items():
        file_path = DATA_DIR / f"{filename}.json"
        
        # Check if file already exists
        if file_path.exists():
            print(f"⚠️  File already exists: {filename}.json")
            continue
        
        # Write the new question bank
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(content, f, ensure_ascii=False, indent=2)
        
        print(f"✓ Created: {filename}.json")
        created_count += 1
    
    print(f"\n{'='*60}")
    print(f"Total new question banks created: {created_count}")
    print(f"{'='*60}")
    
    # Print summary of subjects and grades covered
    print("\n📚 Summary of new question banks:")
    print("-" * 60)
    
    subjects = set()
    grades = set()
    
    for content in NEW_QUESTION_BANKS.values():
        subjects.add(content['meta']['subject'])
        grades.add(content['meta']['grade'])
    
    print(f"New subjects added: {', '.join(sorted(subjects))}")
    print(f"Grade levels covered: {', '.join(sorted(grades, key=int))}")
    
    print("\n📋 Detailed breakdown:")
    for filename, content in NEW_QUESTION_BANKS.items():
        meta = content['meta']
        questions_count = len(content['questions'])
        print(f"  • {meta['subject']} Lớp {meta['grade']}: {questions_count} questions")

if __name__ == "__main__":
    create_question_bank()
