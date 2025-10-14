"""
Vietnamese Vocabulary for OCR Training
Complete Vietnamese alphabet with diacritics
"""

from typing import List


class VietnameseVocab:
    """
    Vocabulary for Vietnamese characters
    Includes all Vietnamese diacritics, numbers, and common symbols
    """
    
    def __init__(self):
        self.chars = [
            # Special characters and symbols
            ' ', '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
            
            # Numbers
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            
            # More symbols
            ':', ';', '<', '=', '>', '?', '@', '[', '\\', ']', '^', '_', '`', '{', '|', '}', '~',
            
            # English uppercase
            'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 
            'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
            
            # English lowercase
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
            'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
            
            # Vietnamese uppercase vowels with diacritics
            'À', 'Á', 'Â', 'Ã', 'È', 'É', 'Ê', 'Ì', 'Í', 'Ò', 'Ó', 'Ô', 'Õ', 'Ù', 'Ú', 'Ý',
            
            # Vietnamese lowercase vowels with diacritics  
            'à', 'á', 'â', 'ã', 'è', 'é', 'ê', 'ì', 'í', 'ò', 'ó', 'ô', 'õ', 'ù', 'ú', 'ý',
            
            # Vietnamese special characters
            'Ă', 'ă', 'Đ', 'đ', 'Ĩ', 'ĩ', 'Ũ', 'ũ', 'Ơ', 'ơ', 'Ư', 'ư',
            
            # A with diacritics
            'Ạ', 'ạ', 'Ả', 'ả', 'Ấ', 'ấ', 'Ầ', 'ầ', 'Ẩ', 'ẩ', 'Ẫ', 'ẫ', 'Ậ', 'ậ',
            'Ắ', 'ắ', 'Ằ', 'ằ', 'Ẳ', 'ẳ', 'Ẵ', 'ẵ', 'Ặ', 'ặ',
            
            # E with diacritics
            'Ẹ', 'ẹ', 'Ẻ', 'ẻ', 'Ẽ', 'ẽ', 'Ế', 'ế', 'Ề', 'ề', 'Ể', 'ể', 'Ễ', 'ễ', 'Ệ', 'ệ',
            
            # I with diacritics
            'Ỉ', 'ỉ', 'Ị', 'ị',
            
            # O with diacritics
            'Ọ', 'ọ', 'Ỏ', 'ỏ', 'Ố', 'ố', 'Ồ', 'ồ', 'Ổ', 'ổ', 'Ỗ', 'ỗ', 'Ộ', 'ộ',
            'Ớ', 'ớ', 'Ờ', 'ờ', 'Ở', 'ở', 'Ỡ', 'ỡ', 'Ợ', 'ợ',
            
            # U with diacritics
            'Ụ', 'ụ', 'Ủ', 'ủ', 'Ứ', 'ứ', 'Ừ', 'ừ', 'Ử', 'ử', 'Ữ', 'ữ', 'Ự', 'ự',
            
            # Y with diacritics
            'Ỳ', 'ỳ', 'Ỵ', 'ỵ', 'Ỷ', 'ỷ', 'Ỹ', 'ỹ'
        ]
        
        # CTC blank token at index 0
        self.blank_idx = 0
        
        # Build character to index mapping
        self.char_to_idx = {'[BLANK]': self.blank_idx}
        for idx, char in enumerate(self.chars, start=1):
            self.char_to_idx[char] = idx
        
        # Build index to character mapping
        self.idx_to_char = {v: k for k, v in self.char_to_idx.items()}
        
        # Vocabulary size (including blank)
        self.vocab_size = len(self.char_to_idx)
        
        print(f"✅ Vietnamese Vocabulary initialized")
        print(f"   Total characters: {len(self.chars)}")
        print(f"   Vocab size (with blank): {self.vocab_size}")
    
    def encode(self, text: str) -> List[int]:
        """
        Encode text to list of indices
        
        Args:
            text: Input text string
            
        Returns:
            List of character indices
        """
        # Replace unknown characters with space
        return [self.char_to_idx.get(char, self.char_to_idx[' ']) for char in text]
    
    def decode(self, indices: List[int]) -> str:
        """
        Decode list of indices to text
        
        Args:
            indices: List of character indices
            
        Returns:
            Decoded text string
        """
        # Remove blank tokens and duplicates (CTC decoding)
        decoded_chars = []
        prev_idx = -1
        
        for idx in indices:
            if idx != self.blank_idx and idx != prev_idx:
                char = self.idx_to_char.get(idx, '')
                if char and char != '[BLANK]':
                    decoded_chars.append(char)
            prev_idx = idx
        
        return ''.join(decoded_chars)
    
    def get_char_list(self) -> List[str]:
        """Get list of all characters"""
        return self.chars.copy()
    
    def contains_char(self, char: str) -> bool:
        """Check if character is in vocabulary"""
        return char in self.char_to_idx


# Test vocabulary
if __name__ == "__main__":
    vocab = VietnameseVocab()
    
    # Test encoding/decoding
    test_text = "Xin chào! Tôi học tiếng Việt."
    print(f"\nOriginal text: {test_text}")
    
    # Encode
    encoded = vocab.encode(test_text)
    print(f"Encoded: {encoded[:20]}...")  # Show first 20 indices
    
    # Decode
    decoded = vocab.decode(encoded)
    print(f"Decoded: {decoded}")
    
    # Verify
    assert decoded == test_text, "Encoding/decoding mismatch!"
    print("✅ Encoding/decoding test passed!")
    
    # Test Vietnamese diacritics
    vietnamese_text = "Đây là văn bản tiếng Việt với các dấu: àáạảãâầấậẩẫăằắặẳẵ"
    encoded_vn = vocab.encode(vietnamese_text)
    decoded_vn = vocab.decode(encoded_vn)
    print(f"\nVietnamese test: {vietnamese_text}")
    print(f"Decoded: {decoded_vn}")
    assert decoded_vn == vietnamese_text, "Vietnamese diacritics failed!"
    print("✅ Vietnamese diacritics test passed!")

