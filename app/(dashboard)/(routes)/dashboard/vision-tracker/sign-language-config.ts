
/**
 * Sign Language Recognition System
 * Ngôn ngữ ký hiệu dành cho người khiếm thính
 * Vietnamese Sign Language (VSL) + International Signs
 */

export type SignLanguageType =
    // Alphabet (A-Z)
    | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J'
    | 'K' | 'L' | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T'
    | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z'

    // Numbers (0-10)
    | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'

    // Common words
    | 'HELLO'           // Xin chào
    | 'GOODBYE'         // Tạm biệt
    | 'THANK_YOU'       // Cảm ơn
    | 'PLEASE'          // Làm ơn
    | 'YES'             // Vâng/Có
    | 'NO'              // Không
    | 'SORRY'           // Xin lỗi
    | 'HELP'            // Giúp đỡ
    | 'LOVE'            // Yêu
    | 'FAMILY'          // Gia đình
    | 'FRIEND'          // Bạn bè
    | 'HAPPY'           // Vui
    | 'SAD'             // Buồn
    | 'GOOD'            // Tốt
    | 'BAD'             // Xấu
    | 'EAT'             // Ăn
    | 'DRINK'           // Uống
    | 'SLEEP'           // Ngủ
    | 'WORK'            // Làm việc
    | 'STUDY'           // Học
    | 'HOME'            // Nhà
    | 'SCHOOL'          // Trường học

    // Special signs
    | 'I_LOVE_YOU'      // ❤️ (ASL sign)
    | 'OK'              // 👌
    | 'THUMBS_UP'       // 👍
    | 'PEACE'           // ✌️
    | 'ROCK_ON'         // 🤘
    | 'CALL_ME'         // 🤙

    | 'UNKNOWN';        // Không nhận dạng được

export interface SignDetection {
    sign: SignLanguageType;
    confidence: number;
    timestamp: number;
    handedness: 'Left' | 'Right' | 'Both';
    landmarks?: any[];
}

export interface SignStats {
    [key: string]: number;
    total: number;
}

/**
 * Sign Language Configuration
 */
export const SIGN_CONFIG: Record<SignLanguageType, {
    emoji: string;
    nameEn: string;
    nameVi: string;
    description: string;
    category: 'alphabet' | 'number' | 'word' | 'phrase' | 'special';
    difficulty: 'easy' | 'medium' | 'hard';
    oneHand: boolean;
}> = {
    // ========== ALPHABET ==========
    'A': {
        emoji: '✊',
        nameEn: 'A',
        nameVi: 'Chữ A',
        description: 'Nắm đấm, ngón cái bên cạnh',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'B': {
        emoji: '🖐️',
        nameEn: 'B',
        nameVi: 'Chữ B',
        description: 'Bàn tay thẳng, 4 ngón dựng, ngón cái gập',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'C': {
        emoji: '🤚',
        nameEn: 'C',
        nameVi: 'Chữ C',
        description: 'Bàn tay cong như chữ C',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'D': {
        emoji: '☝️',
        nameEn: 'D',
        nameVi: 'Chữ D',
        description: 'Ngón trỏ dựng, ngón cái chạm giữa + áp út',
        category: 'alphabet',
        difficulty: 'medium',
        oneHand: true
    },
    'E': {
        emoji: '✊',
        nameEn: 'E',
        nameVi: 'Chữ E',
        description: 'Nắm đấm, các ngón gập xuống',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'F': {
        emoji: '👌',
        nameEn: 'F',
        nameVi: 'Chữ F',
        description: 'Ngón cái + trỏ chạm tạo vòng, 3 ngón dựng',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'G': {
        emoji: '👈',
        nameEn: 'G',
        nameVi: 'Chữ G',
        description: 'Ngón trỏ + cái dựng ngang',
        category: 'alphabet',
        difficulty: 'medium',
        oneHand: true
    },
    'H': {
        emoji: '🤞',
        nameEn: 'H',
        nameVi: 'Chữ H',
        description: 'Ngón trỏ + giữa dựng ngang',
        category: 'alphabet',
        difficulty: 'medium',
        oneHand: true
    },
    'I': {
        emoji: '🤙',
        nameEn: 'I',
        nameVi: 'Chữ I',
        description: 'Chỉ ngón út dựng',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'J': {
        emoji: '🤙',
        nameEn: 'J',
        nameVi: 'Chữ J',
        description: 'Ngón út vẽ chữ J',
        category: 'alphabet',
        difficulty: 'hard',
        oneHand: true
    },
    'K': {
        emoji: '✌️',
        nameEn: 'K',
        nameVi: 'Chữ K',
        description: 'Ngón trỏ + giữa dựng, ngón cái giữa chúng',
        category: 'alphabet',
        difficulty: 'medium',
        oneHand: true
    },
    'L': {
        emoji: '👍',
        nameEn: 'L',
        nameVi: 'Chữ L',
        description: 'Ngón cái + trỏ tạo góc L',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'M': {
        emoji: '✊',
        nameEn: 'M',
        nameVi: 'Chữ M',
        description: 'Nắm đấm, ngón cái dưới 3 ngón',
        category: 'alphabet',
        difficulty: 'medium',
        oneHand: true
    },
    'N': {
        emoji: '✊',
        nameEn: 'N',
        nameVi: 'Chữ N',
        description: 'Nắm đấm, ngón cái dưới 2 ngón',
        category: 'alphabet',
        difficulty: 'medium',
        oneHand: true
    },
    'O': {
        emoji: '👌',
        nameEn: 'O',
        nameVi: 'Chữ O',
        description: 'Các ngón tạo vòng tròn',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'P': {
        emoji: '☝️',
        nameEn: 'P',
        nameVi: 'Chữ P',
        description: 'Như K nhưng hướng xuống',
        category: 'alphabet',
        difficulty: 'hard',
        oneHand: true
    },
    'Q': {
        emoji: '👇',
        nameEn: 'Q',
        nameVi: 'Chữ Q',
        description: 'Như G nhưng hướng xuống',
        category: 'alphabet',
        difficulty: 'hard',
        oneHand: true
    },
    'R': {
        emoji: '🤞',
        nameEn: 'R',
        nameVi: 'Chữ R',
        description: 'Ngón trỏ + giữa chéo nhau',
        category: 'alphabet',
        difficulty: 'medium',
        oneHand: true
    },
    'S': {
        emoji: '✊',
        nameEn: 'S',
        nameVi: 'Chữ S',
        description: 'Nắm đấm, ngón cái phủ lên',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'T': {
        emoji: '✊',
        nameEn: 'T',
        nameVi: 'Chữ T',
        description: 'Ngón cái giữa trỏ + giữa',
        category: 'alphabet',
        difficulty: 'medium',
        oneHand: true
    },
    'U': {
        emoji: '✌️',
        nameEn: 'U',
        nameVi: 'Chữ U',
        description: 'Ngón trỏ + giữa dựng sát nhau',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'V': {
        emoji: '✌️',
        nameEn: 'V',
        nameVi: 'Chữ V',
        description: 'Ngón trỏ + giữa dựng tách ra',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'W': {
        emoji: '🖖',
        nameEn: 'W',
        nameVi: 'Chữ W',
        description: 'Trỏ + giữa + áp út dựng',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'X': {
        emoji: '☝️',
        nameEn: 'X',
        nameVi: 'Chữ X',
        description: 'Ngón trỏ cong như móc',
        category: 'alphabet',
        difficulty: 'medium',
        oneHand: true
    },
    'Y': {
        emoji: '🤙',
        nameEn: 'Y',
        nameVi: 'Chữ Y',
        description: 'Ngón cái + út dựng',
        category: 'alphabet',
        difficulty: 'easy',
        oneHand: true
    },
    'Z': {
        emoji: '☝️',
        nameEn: 'Z',
        nameVi: 'Chữ Z',
        description: 'Ngón trỏ vẽ chữ Z',
        category: 'alphabet',
        difficulty: 'hard',
        oneHand: true
    },

    // ========== NUMBERS ==========
    '0': {
        emoji: '👌',
        nameEn: 'Zero',
        nameVi: 'Số 0',
        description: 'Tạo vòng tròn với ngón tay',
        category: 'number',
        difficulty: 'easy',
        oneHand: true
    },
    '1': {
        emoji: '☝️',
        nameEn: 'One',
        nameVi: 'Số 1',
        description: 'Giơ 1 ngón trỏ',
        category: 'number',
        difficulty: 'easy',
        oneHand: true
    },
    '2': {
        emoji: '✌️',
        nameEn: 'Two',
        nameVi: 'Số 2',
        description: 'Giơ 2 ngón (trỏ + giữa)',
        category: 'number',
        difficulty: 'easy',
        oneHand: true
    },
    '3': {
        emoji: '🖖',
        nameEn: 'Three',
        nameVi: 'Số 3',
        description: 'Giơ 3 ngón (cái + trỏ + giữa)',
        category: 'number',
        difficulty: 'easy',
        oneHand: true
    },
    '4': {
        emoji: '🖐️',
        nameEn: 'Four',
        nameVi: 'Số 4',
        description: 'Giơ 4 ngón (trừ ngón cái)',
        category: 'number',
        difficulty: 'easy',
        oneHand: true
    },
    '5': {
        emoji: '🖐️',
        nameEn: 'Five',
        nameVi: 'Số 5',
        description: 'Giơ cả 5 ngón',
        category: 'number',
        difficulty: 'easy',
        oneHand: true
    },
    '6': {
        emoji: '🤙',
        nameEn: 'Six',
        nameVi: 'Số 6',
        description: 'Ngón út + cái chạm, 3 ngón gập',
        category: 'number',
        difficulty: 'medium',
        oneHand: true
    },
    '7': {
        emoji: '🖖',
        nameEn: 'Seven',
        nameVi: 'Số 7',
        description: 'Áp út + cái chạm, 3 ngón dựng',
        category: 'number',
        difficulty: 'medium',
        oneHand: true
    },
    '8': {
        emoji: '🖖',
        nameEn: 'Eight',
        nameVi: 'Số 8',
        description: 'Giữa + cái chạm, 3 ngón dựng',
        category: 'number',
        difficulty: 'medium',
        oneHand: true
    },
    '9': {
        emoji: '👌',
        nameEn: 'Nine',
        nameVi: 'Số 9',
        description: 'Trỏ + cái chạm, 3 ngón dựng',
        category: 'number',
        difficulty: 'medium',
        oneHand: true
    },
    '10': {
        emoji: '🤘',
        nameEn: 'Ten',
        nameVi: 'Số 10',
        description: 'Lắc nắm đấm hoặc giơ 2 tay (5+5)',
        category: 'number',
        difficulty: 'easy',
        oneHand: true
    },

    // ========== COMMON WORDS ==========
    'HELLO': {
        emoji: '👋',
        nameEn: 'Hello',
        nameVi: 'Xin chào',
        description: 'Vẫy tay hoặc chạm trán rồi mở ra',
        category: 'word',
        difficulty: 'easy',
        oneHand: true
    },
    'GOODBYE': {
        emoji: '👋',
        nameEn: 'Goodbye',
        nameVi: 'Tạm biệt',
        description: 'Vẫy tay qua lại',
        category: 'word',
        difficulty: 'easy',
        oneHand: true
    },
    'THANK_YOU': {
        emoji: '🙏',
        nameEn: 'Thank you',
        nameVi: 'Cảm ơn',
        description: 'Tay từ miệng hướng ra ngoài',
        category: 'word',
        difficulty: 'easy',
        oneHand: true
    },
    'PLEASE': {
        emoji: '🤲',
        nameEn: 'Please',
        nameVi: 'Làm ơn',
        description: 'Bàn tay xoa tròn trên ngực',
        category: 'word',
        difficulty: 'medium',
        oneHand: true
    },
    'YES': {
        emoji: '✊',
        nameEn: 'Yes',
        nameVi: 'Vâng/Có',
        description: 'Nắm đấm gật lên xuống',
        category: 'word',
        difficulty: 'easy',
        oneHand: true
    },
    'NO': {
        emoji: '🤚',
        nameEn: 'No',
        nameVi: 'Không',
        description: 'Lắc tay hoặc trỏ + giữa + cái khép lại',
        category: 'word',
        difficulty: 'easy',
        oneHand: true
    },
    'SORRY': {
        emoji: '✊',
        nameEn: 'Sorry',
        nameVi: 'Xin lỗi',
        description: 'Nắm đấm xoa tròn trên ngực',
        category: 'word',
        difficulty: 'medium',
        oneHand: true
    },
    'HELP': {
        emoji: '👍',
        nameEn: 'Help',
        nameVi: 'Giúp đỡ',
        description: 'Tay phẳng đỡ nắm đấm bên kia',
        category: 'word',
        difficulty: 'medium',
        oneHand: false
    },
    'LOVE': {
        emoji: '❤️',
        nameEn: 'Love',
        nameVi: 'Yêu',
        description: '2 tay chéo trên ngực',
        category: 'word',
        difficulty: 'easy',
        oneHand: false
    },
    'FAMILY': {
        emoji: '👨‍👩‍👧‍👦',
        nameEn: 'Family',
        nameVi: 'Gia đình',
        description: '2 tay chữ F tạo vòng tròn',
        category: 'word',
        difficulty: 'medium',
        oneHand: false
    },
    'FRIEND': {
        emoji: '🤝',
        nameEn: 'Friend',
        nameVi: 'Bạn bè',
        description: '2 ngón trỏ móc vào nhau',
        category: 'word',
        difficulty: 'medium',
        oneHand: false
    },
    'HAPPY': {
        emoji: '😊',
        nameEn: 'Happy',
        nameVi: 'Vui',
        description: 'Tay xoa lên xuống trước ngực',
        category: 'word',
        difficulty: 'easy',
        oneHand: true
    },
    'SAD': {
        emoji: '😢',
        nameEn: 'Sad',
        nameVi: 'Buồn',
        description: 'Tay từ mặt kéo xuống',
        category: 'word',
        difficulty: 'easy',
        oneHand: true
    },
    'GOOD': {
        emoji: '👍',
        nameEn: 'Good',
        nameVi: 'Tốt',
        description: 'Tay từ miệng hướng ra, ngón cái lên',
        category: 'word',
        difficulty: 'easy',
        oneHand: true
    },
    'BAD': {
        emoji: '👎',
        nameEn: 'Bad',
        nameVi: 'Xấu',
        description: 'Tay từ miệng quay xuống',
        category: 'word',
        difficulty: 'easy',
        oneHand: true
    },
    'EAT': {
        emoji: '🍽️',
        nameEn: 'Eat',
        nameVi: 'Ăn',
        description: 'Ngón tay chụm lại chạm môi',
        category: 'word',
        difficulty: 'easy',
        oneHand: true
    },
    'DRINK': {
        emoji: '🥤',
        nameEn: 'Drink',
        nameVi: 'Uống',
        description: 'Tay chữ C chạm miệng',
        category: 'word',
        difficulty: 'easy',
        oneHand: true
    },
    'SLEEP': {
        emoji: '😴',
        nameEn: 'Sleep',
        nameVi: 'Ngủ',
        description: 'Tay áp vào má, nghiêng đầu',
        category: 'word',
        difficulty: 'easy',
        oneHand: true
    },
    'WORK': {
        emoji: '💼',
        nameEn: 'Work',
        nameVi: 'Làm việc',
        description: '2 nắm đấm chạm nhau nhiều lần',
        category: 'word',
        difficulty: 'medium',
        oneHand: false
    },
    'STUDY': {
        emoji: '📚',
        nameEn: 'Study',
        nameVi: 'Học',
        description: 'Tay đọc sách ảo',
        category: 'word',
        difficulty: 'medium',
        oneHand: false
    },
    'HOME': {
        emoji: '🏠',
        nameEn: 'Home',
        nameVi: 'Nhà',
        description: '2 tay tạo hình mái nhà',
        category: 'word',
        difficulty: 'easy',
        oneHand: false
    },
    'SCHOOL': {
        emoji: '🏫',
        nameEn: 'School',
        nameVi: 'Trường học',
        description: 'Vỗ tay 2 lần',
        category: 'word',
        difficulty: 'easy',
        oneHand: false
    },

    // ========== SPECIAL SIGNS ==========
    'I_LOVE_YOU': {
        emoji: '🤟',
        nameEn: 'I Love You',
        nameVi: 'Tôi yêu bạn',
        description: 'Ngón cái + trỏ + út dựng (ASL)',
        category: 'special',
        difficulty: 'easy',
        oneHand: true
    },
    'OK': {
        emoji: '👌',
        nameEn: 'OK',
        nameVi: 'OK',
        description: 'Ngón cái + trỏ tạo vòng',
        category: 'special',
        difficulty: 'easy',
        oneHand: true
    },
    'THUMBS_UP': {
        emoji: '👍',
        nameEn: 'Thumbs Up',
        nameVi: 'Tốt/Đồng ý',
        description: 'Ngón cái lên',
        category: 'special',
        difficulty: 'easy',
        oneHand: true
    },
    'PEACE': {
        emoji: '✌️',
        nameEn: 'Peace',
        nameVi: 'Hòa bình',
        description: 'Ngón trỏ + giữa',
        category: 'special',
        difficulty: 'easy',
        oneHand: true
    },
    'ROCK_ON': {
        emoji: '🤘',
        nameEn: 'Rock On',
        nameVi: 'Rock',
        description: 'Ngón trỏ + út dựng',
        category: 'special',
        difficulty: 'easy',
        oneHand: true
    },
    'CALL_ME': {
        emoji: '🤙',
        nameEn: 'Call Me',
        nameVi: 'Gọi cho tôi',
        description: 'Ngón cái + út (shaka)',
        category: 'special',
        difficulty: 'easy',
        oneHand: true
    },

    'UNKNOWN': {
        emoji: '❓',
        nameEn: 'Unknown',
        nameVi: 'Không rõ',
        description: 'Không nhận dạng được',
        category: 'special',
        difficulty: 'easy',
        oneHand: true
    }
};

/**
 * Get all signs by category
 */
export const getSignsByCategory = (category: 'alphabet' | 'number' | 'word' | 'phrase' | 'special'): SignLanguageType[] => {
    return Object.entries(SIGN_CONFIG)
        .filter(([_, config]) => config.category === category)
        .map(([sign, _]) => sign as SignLanguageType);
};

/**
 * Get alphabet signs (A-Z)
 */
export const ALPHABET_SIGNS = getSignsByCategory('alphabet');

/**
 * Get number signs (0-10)
 */
export const NUMBER_SIGNS = getSignsByCategory('number');

/**
 * Get word signs
 */
export const WORD_SIGNS = getSignsByCategory('word');

/**
 * Get special signs
 */
export const SPECIAL_SIGNS = getSignsByCategory('special');

/**
 * Vietnamese Sign Language (VSL) specific mappings
 * Ngôn ngữ ký hiệu Việt Nam
 */
export const VSL_COMMON_PHRASES: Record<string, {
    signs: SignLanguageType[];
    meaning: string;
}> = {
    'XIN_CHAO': {
        signs: ['HELLO'],
        meaning: 'Xin chào'
    },
    'CAM_ON': {
        signs: ['THANK_YOU'],
        meaning: 'Cảm ơn'
    },
    'XIN_LOI': {
        signs: ['SORRY'],
        meaning: 'Xin lỗi'
    },
    'TOI_YEU_BAN': {
        signs: ['I_LOVE_YOU'],
        meaning: 'Tôi yêu bạn'
    },
    'TEN_TOI_LA': {
        signs: ['M', 'Y', 'N', 'A', 'M', 'E'],
        meaning: 'Tên tôi là... (My name)'
    }
};

/**
 * Learning paths for beginners
 */
export const LEARNING_PATHS = {
    BEGINNER: {
        name: 'Người mới bắt đầu',
        lessons: [
            { title: 'Bảng chữ cái A-Z', signs: ALPHABET_SIGNS, duration: '30 phút' },
            { title: 'Số đếm 0-10', signs: NUMBER_SIGNS, duration: '15 phút' },
            { title: 'Lời chào cơ bản', signs: ['HELLO', 'GOODBYE', 'THANK_YOU'], duration: '10 phút' }
        ]
    },
    INTERMEDIATE: {
        name: 'Trung cấp',
        lessons: [
            { title: 'Từ vựng hàng ngày', signs: ['EAT', 'DRINK', 'SLEEP', 'WORK', 'STUDY'], duration: '20 phút' },
            { title: 'Cảm xúc', signs: ['HAPPY', 'SAD', 'LOVE'], duration: '15 phút' },
            { title: 'Gia đình & Bạn bè', signs: ['FAMILY', 'FRIEND'], duration: '15 phút' }
        ]
    },
    ADVANCED: {
        name: 'Nâng cao',
        lessons: [
            { title: 'Ghép từ thành câu', signs: [], duration: '45 phút' },
            { title: 'Ngữ pháp VSL', signs: [], duration: '60 phút' }
        ]
    }
};
