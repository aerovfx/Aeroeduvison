# 🌍 Multilingual Support Guide

## Overview
The application now supports **Vietnamese (VN)** and **English (EN)** languages with a comprehensive translation system.

## Features

### 🔄 Language Switcher Component
- **Location**: Available in headers of all main pages
- **Design**: Compact button with globe icon and language code
- **Functionality**: Instant language switching with persistent state

### 📝 Translation System
- **Context**: `LanguageContext` provides global language state
- **Keys**: Comprehensive translation keys for all UI elements
- **Fallback**: Graceful fallback to key names if translation missing

## Implementation

### 1. Language Switcher Components

#### `LanguageSwitcher` (Default)
```tsx
import { LanguageSwitcher } from '@/components/ui/language-switcher';

<LanguageSwitcher />
```

#### `LanguageSwitcherCompact` (For Headers)
```tsx
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';

<LanguageSwitcherCompact />
```

#### `LanguageSwitcherMinimal` (For Small Spaces)
```tsx
import { LanguageSwitcherMinimal } from '@/components/ui/language-switcher';

<LanguageSwitcherMinimal />
```

### 2. Using Translations in Components

```tsx
import { useLanguage } from '@/contexts/LanguageContext';

export default function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t('common.title')}</h1>
      <p>{t('common.description')}</p>
    </div>
  );
}
```

### 3. Adding New Translation Keys

#### In `contexts/LanguageContext.tsx`:

```typescript
const translations = {
  vi: {
    // Vietnamese translations
    'my-component.title': 'Tiêu đề của tôi',
    'my-component.description': 'Mô tả chi tiết',
  },
  en: {
    // English translations
    'my-component.title': 'My Title',
    'my-component.description': 'Detailed description',
  }
};
```

## Pages with Language Support

### ✅ Completed
- **Homepage** (`/`) - Full translation support
- **Dashboard** (`/dashboard`) - Language switcher added
- **Emotion Tracker** (`/dashboard/emotion`) - Complete translation
- **LabTwin** (`/dashboard/labtwin`) - Language switcher added
- **Labs List** (`/dashboard/labtwin/labs`) - Language switcher added
- **Analytics** (`/dashboard/analytics`) - Language switcher added
- **Achievements** (`/dashboard/achievements`) - Language switcher added

### 🔄 In Progress
- **Individual Lab Pages** - Need translation keys
- **Admin Pages** - Need translation keys
- **Teacher Dashboard** - Need translation keys

## Translation Keys Structure

### Common Keys
```typescript
'common.title': 'Title'
'common.description': 'Description'
'common.save': 'Save'
'common.cancel': 'Cancel'
'common.loading': 'Loading...'
```

### Emotion Tracker Keys
```typescript
'emotion.title': 'Emotion & Engagement Tracker'
'emotion.subtitle': 'Track emotions and learning motivation'
'emotion.refresh-layout': 'Refresh Layout'
'emotion.edit-layout': 'Edit Layout'
```

### Admin Keys
```typescript
'admin.dashboard': 'Dashboard'
'admin.users': 'Users'
'admin.courses': 'Courses'
```

## Usage Examples

### 1. Basic Translation
```tsx
<h1>{t('emotion.title')}</h1>
```

### 2. Translation with Parameters
```typescript
// In translations
'welcome.message': 'Welcome, {name}!'

// In component
<p>{t('welcome.message', { name: 'John' })}</p>
```

### 3. Conditional Translation
```tsx
<p>{language === 'vi' ? 'Xin chào' : 'Hello'}</p>
```

## Best Practices

### 1. Key Naming Convention
- Use dot notation: `component.element.action`
- Be descriptive: `emotion.refresh-layout` not `emotion.btn1`
- Group related keys: `admin.*`, `student.*`, `common.*`

### 2. Translation Quality
- Keep translations concise but clear
- Maintain consistent tone across languages
- Test with different text lengths (some languages are longer)

### 3. Performance
- Translations are loaded once and cached
- No performance impact on language switching
- Minimal bundle size increase

## Adding Language Switcher to New Pages

### Manual Method
1. Import the component:
```tsx
import { LanguageSwitcherCompact } from '@/components/ui/language-switcher';
```

2. Add to header:
```tsx
<div className="flex items-center gap-4">
  <h1>Page Title</h1>
  <LanguageSwitcherCompact />
</div>
```

### Automatic Method
Run the script to add to multiple pages:
```bash
npm run add-language-switcher
```

## Future Enhancements

### 🚀 Planned Features
- **RTL Support** - Right-to-left languages (Arabic, Hebrew)
- **More Languages** - Spanish, French, Chinese, Japanese
- **Auto-Detection** - Detect user's browser language
- **Regional Variants** - US English vs UK English
- **Pluralization** - Handle singular/plural forms
- **Date/Time Formatting** - Localized date formats
- **Number Formatting** - Localized number formats

### 🔧 Technical Improvements
- **Lazy Loading** - Load translations on demand
- **Namespace Splitting** - Split translations by feature
- **Translation Management** - External translation service
- **Missing Key Detection** - Development warnings
- **Translation Validation** - Ensure all keys exist

## Troubleshooting

### Common Issues

#### 1. Translation Not Showing
- Check if key exists in both `vi` and `en` objects
- Verify key spelling matches exactly
- Ensure `useLanguage` hook is imported

#### 2. Language Switcher Not Working
- Check if `LanguageProvider` wraps the app
- Verify `LanguageContext` is properly configured
- Check browser console for errors

#### 3. Missing Translations
- Add missing keys to `LanguageContext.tsx`
- Use fallback text while translations are being added
- Consider using translation management tools

## Contributing

### Adding New Translations
1. Identify missing translation keys
2. Add keys to both `vi` and `en` objects in `LanguageContext.tsx`
3. Test the translations in both languages
4. Update this documentation if needed

### Testing Translations
1. Switch between languages using the switcher
2. Verify all text changes appropriately
3. Check for layout issues with longer/shorter text
4. Test on different screen sizes

---

**Last Updated**: October 2025  
**Version**: 1.0.0  
**Maintainer**: Development Team
