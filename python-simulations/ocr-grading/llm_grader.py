"""
LLM-based Grader for Auto-grading Student Answers
Uses Grok, OpenAI, or other LLMs to analyze and grade answers
"""

import os
from typing import List, Dict, Optional
import json
import logging
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class LLMGrader:
    """LLM-based answer grader"""
    
    def __init__(self, model='grok', api_key=None):
        """
        Initialize LLM grader
        
        Args:
            model: 'grok', 'openai', or 'demo'
            api_key: API key for the model
        """
        self.model = model
        self.api_key = api_key or self._get_api_key()
        
        if model == 'grok':
            self.api_url = 'https://api.x.ai/v1/chat/completions'
            self.model_name = 'grok-beta'
        elif model == 'openai':
            self.api_url = 'https://api.openai.com/v1/chat/completions'
            self.model_name = 'gpt-4-turbo-preview'
        else:
            self.model_name = 'demo'
    
    def _get_api_key(self) -> str:
        """Get API key from environment"""
        if self.model == 'grok':
            return os.getenv('GROK_API_KEY', '')
        elif self.model == 'openai':
            return os.getenv('OPENAI_API_KEY', '')
        return ''
    
    def create_grading_prompt(self, 
                             student_answer: str, 
                             correct_answer: str, 
                             question: str,
                             max_points: int = 10) -> str:
        """
        Create prompt for LLM grading
        
        Args:
            student_answer: Student's answer
            correct_answer: Correct answer/rubric
            question: The question text
            max_points: Maximum points for this question
            
        Returns:
            Formatted prompt
        """
        prompt = f"""Bạn là một giáo viên chuyên nghiệp với nhiều năm kinh nghiệm chấm bài. 
Hãy đánh giá câu trả lời của học sinh dựa trên đáp án chuẩn.

**CÂU HỎI:**
{question}

**ĐÁP ÁN CHUẨN:**
{correct_answer}

**CÂU TRẢ LỜI CỦA HỌC SINH:**
{student_answer}

**ĐIỂM TỐI ĐA:** {max_points} điểm

**YÊU CẦU ĐÁNH GIÁ:**
1. Phân tích câu trả lời của học sinh
2. So sánh với đáp án chuẩn
3. Xác định các ý đúng và các ý sai hoặc thiếu
4. Đưa ra điểm số công bằng (từ 0 đến {max_points})
5. Đưa ra nhận xét chi tiết và gợi ý cải thiện

**ĐỊNH DẠNG TRẢ LỜI (JSON):**
{{
    "analysis": "Phân tích chi tiết câu trả lời của học sinh",
    "correct_points": ["Điểm đúng 1", "Điểm đúng 2", ...],
    "incorrect_points": ["Điểm sai 1", "Điểm sai 2", ...],
    "missing_points": ["Ý còn thiếu 1", "Ý còn thiếu 2", ...],
    "score": 8.5,
    "feedback": "Nhận xét tổng quát về bài làm",
    "suggestions": ["Gợi ý cải thiện 1", "Gợi ý cải thiện 2", ...]
}}

Hãy trả về kết quả dưới dạng JSON hợp lệ."""

        return prompt
    
    async def grade_with_llm(self, 
                            student_answer: str, 
                            correct_answer: str, 
                            question: str,
                            max_points: int = 10) -> Dict:
        """
        Grade answer using LLM
        
        Args:
            student_answer: Student's answer
            correct_answer: Correct answer
            question: Question text
            max_points: Maximum points
            
        Returns:
            Grading result
        """
        if self.model == 'demo':
            return self._demo_grading(student_answer, correct_answer, max_points)
        
        prompt = self.create_grading_prompt(
            student_answer, correct_answer, question, max_points
        )
        
        try:
            import aiohttp
            
            async with aiohttp.ClientSession() as session:
                headers = {
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {self.api_key}'
                }
                
                payload = {
                    'model': self.model_name,
                    'messages': [
                        {
                            'role': 'system',
                            'content': 'Bạn là một giáo viên chuyên nghiệp, chấm bài công bằng và chi tiết.'
                        },
                        {
                            'role': 'user',
                            'content': prompt
                        }
                    ],
                    'temperature': 0.3,  # Low temperature for consistent grading
                    'max_tokens': 2000
                }
                
                async with session.post(self.api_url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        data = await response.json()
                        content = data['choices'][0]['message']['content']
                        
                        # Try to parse JSON from response
                        try:
                            # Extract JSON from markdown code blocks if present
                            if '```json' in content:
                                content = content.split('```json')[1].split('```')[0].strip()
                            elif '```' in content:
                                content = content.split('```')[1].split('```')[0].strip()
                            
                            result = json.loads(content)
                            result['model'] = self.model
                            return result
                        except json.JSONDecodeError:
                            # If JSON parsing fails, create structured response
                            return {
                                'analysis': content,
                                'score': max_points * 0.7,  # Default 70%
                                'feedback': 'LLM response không theo format JSON chuẩn',
                                'model': self.model,
                                'raw_response': content
                            }
                    else:
                        error_text = await response.text()
                        logger.error(f"LLM API error: {response.status} - {error_text}")
                        return self._demo_grading(student_answer, correct_answer, max_points)
                        
        except Exception as e:
            logger.error(f"Error calling LLM: {e}")
            return self._demo_grading(student_answer, correct_answer, max_points)
    
    def _demo_grading(self, student_answer: str, correct_answer: str, max_points: int) -> Dict:
        """
        Demo grading using simple keyword matching
        
        Args:
            student_answer: Student's answer
            correct_answer: Correct answer
            max_points: Maximum points
            
        Returns:
            Demo grading result
        """
        # Simple keyword-based scoring
        student_words = set(student_answer.lower().split())
        correct_words = set(correct_answer.lower().split())
        
        # Calculate overlap
        common_words = student_words.intersection(correct_words)
        if len(correct_words) > 0:
            similarity = len(common_words) / len(correct_words)
        else:
            similarity = 0
        
        score = max_points * similarity
        
        return {
            'analysis': f'Câu trả lời có {len(common_words)} từ khóa trùng khớp với đáp án chuẩn.',
            'correct_points': [f'Có các từ khóa: {", ".join(list(common_words)[:5])}'],
            'incorrect_points': ['Demo mode - chưa phân tích chi tiết'],
            'missing_points': ['Demo mode - chưa xác định ý thiếu'],
            'score': round(score, 1),
            'feedback': f'Điểm tương đồng: {similarity * 100:.1f}%. Bài làm {"tốt" if similarity > 0.7 else "cần cải thiện"}.',
            'suggestions': ['Học thêm về chủ đề này', 'Làm thêm bài tập'],
            'model': 'demo'
        }
    
    async def grade_multiple_answers(self, answers: List[Dict]) -> List[Dict]:
        """
        Grade multiple answers
        
        Args:
            answers: List of {question, student_answer, correct_answer, max_points}
            
        Returns:
            List of grading results
        """
        results = []
        
        for i, item in enumerate(answers):
            logger.info(f"Grading question {i + 1}/{len(answers)}...")
            
            result = await self.grade_with_llm(
                student_answer=item.get('student_answer', ''),
                correct_answer=item.get('correct_answer', ''),
                question=item.get('question', f'Câu {i + 1}'),
                max_points=item.get('max_points', 10)
            )
            
            result['question_number'] = i + 1
            result['question'] = item.get('question', '')
            results.append(result)
        
        return results
    
    def calculate_total_score(self, grading_results: List[Dict]) -> Dict:
        """
        Calculate total score from grading results
        
        Args:
            grading_results: List of grading results
            
        Returns:
            Summary with total score
        """
        total_score = sum(r['score'] for r in grading_results)
        max_score = sum(r.get('max_points', 10) for r in grading_results)
        
        percentage = (total_score / max_score * 100) if max_score > 0 else 0
        
        # Determine grade
        if percentage >= 90:
            grade = 'A'
        elif percentage >= 80:
            grade = 'B'
        elif percentage >= 70:
            grade = 'C'
        elif percentage >= 60:
            grade = 'D'
        else:
            grade = 'F'
        
        return {
            'total_score': round(total_score, 1),
            'max_score': max_score,
            'percentage': round(percentage, 1),
            'grade': grade,
            'num_questions': len(grading_results),
            'breakdown': grading_results
        }


# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def test_grader():
        grader = LLMGrader(model='demo')
        
        result = await grader.grade_with_llm(
            student_answer="Photosynthesis là quá trình thực vật sử dụng ánh sáng mặt trời để tạo ra glucose",
            correct_answer="Photosynthesis là quá trình thực vật chuyển hóa CO2 và H2O thành glucose và O2 nhờ ánh sáng mặt trời và chất diệp lục",
            question="Photosynthesis là gì?",
            max_points=10
        )
        
        print(json.dumps(result, indent=2, ensure_ascii=False))
    
    asyncio.run(test_grader())

