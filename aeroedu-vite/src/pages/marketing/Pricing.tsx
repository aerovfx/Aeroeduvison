import { Check } from 'lucide-react'

export default function PricingPage() {
  const plans = [
    {
      name: 'Miễn Phí',
      price: '0',
      description: 'Dành cho cá nhân',
      features: [
        'Truy cập cơ bản',
        '1 khoá học',
        'Không hỗ trợ',
        '5GB dung lượng'
      ]
    },
    {
      name: 'Chuyên Nghiệp',
      price: '99',
      description: 'Dành cho giáo viên',
      features: [
        'Truy cập đầy đủ',
        'Tạo khoá học không giới hạn',
        'Hỗ trợ email',
        '100GB dung lượng',
        'Chấm thi AI'
      ],
      highlighted: true
    },
    {
      name: 'Enterprise',
      price: 'Tùy chỉnh',
      description: 'Dành cho trường học',
      features: [
        'Tất cả tính năng Pro',
        'Hỗ trợ 24/7',
        'Dung lượng không giới hạn',
        'Quản lý IoT',
        'Tích hợp SSO',
        'Tư vấn kỹ thuật'
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-foreground mb-4">Bảng Giá</h1>
          <p className="text-xl text-muted-foreground">Chọn gói phù hợp với nhu cầu của bạn</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-xl border transition-all ${
                plan.highlighted
                  ? 'border-primary bg-card scale-105 shadow-lg'
                  : 'border-border bg-card/50'
              } p-8`}
            >
              {plan.highlighted && (
                <div className="text-center mb-4">
                  <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                    Phổ Biến Nhất
                  </span>
                </div>
              )}

              <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
              <p className="text-muted-foreground text-sm mb-4">{plan.description}</p>

              <div className="mb-6">
                <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                {plan.price !== 'Tùy chỉnh' && <span className="text-muted-foreground">/tháng</span>}
              </div>

              <button
                className={`w-full py-2 rounded-lg font-medium mb-6 transition-colors ${
                  plan.highlighted
                    ? 'bg-primary text-white hover:bg-primary/90'
                    : 'bg-background text-foreground border border-border hover:bg-card'
                }`}
              >
                Chọn Gói
              </button>

              <div className="space-y-3">
                {plan.features.map((feature, fidx) => (
                  <div key={fidx} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
